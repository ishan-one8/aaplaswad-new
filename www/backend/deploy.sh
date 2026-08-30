#!/bin/bash
# ============================================
# SAI PRASAD — AWS Backend Deployment Script
# Creates: DynamoDB + Lambda + API Gateway
# Region: ap-south-1 (Mumbai)
# ============================================

set -e

REGION="ap-south-1"
TABLE_NAME="sai_prasad_orders"
STAFF_TABLE="sai_prasad_staff"
CONFIG_TABLE="sai_prasad_config"
SUBSCRIBER_TABLE="sai_prasad_subscribers"
CUSTOMER_TABLE="sai_prasad_customers"
DATE_INDEX="date-index"
FUNCTION_NAME="sai-prasad-api"
ROLE_NAME="sai-prasad-lambda-role"
API_NAME="sai-prasad-api"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

GOOGLE_CLIENT_ID="861754401920-c1gc6di0ne4cfurikkbnj3tv2obb8fu4.apps.googleusercontent.com"
# The staff app runs inside Capacitor, whose Android WebView origin is
# https://localhost. API Gateway rejects custom schemes, so capacitor:// is not
# listed here.
ALLOWED_ORIGINS="https://aaplaswad.store,https://sai-prasad-seven.vercel.app,https://localhost"

# Auth rollout switch. Keep 'false' until the staff app and the updated
# customer app are live, then re-run with ENFORCE_AUTH=true to lock the API.
ENFORCE_AUTH="${ENFORCE_AUTH:-false}"

# Seed admin — the only account created in code. Everyone else is added
# from the Admin → Staff screen.
# Razorpay secret — read from the CSV next to the project so it is never in
# this script. Without it, online payments cannot be verified and are refused.
# Set once in the Razorpay dashboard (Settings → Webhooks) and passed here.
# Preserved across redeploys like the other secrets.
RAZORPAY_WEBHOOK_SECRET="${RAZORPAY_WEBHOOK_SECRET:-$(aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME --region $REGION \
    --query 'Environment.Variables.RAZORPAY_WEBHOOK_SECRET' --output text 2>/dev/null || echo "")}"
[ "$RAZORPAY_WEBHOOK_SECRET" = "None" ] && RAZORPAY_WEBHOOK_SECRET=""

RAZORPAY_CSV="${RAZORPAY_CSV:-$(dirname "$0")/../razorpay_live_api.csv}"
if [ -f "$RAZORPAY_CSV" ]; then
    RAZORPAY_KEY_ID=$(awk -F, 'NR==2{print $1}' "$RAZORPAY_CSV" | tr -d ' \r')
    RAZORPAY_KEY_SECRET=$(awk -F, 'NR==2{print $2}' "$RAZORPAY_CSV" | tr -d ' \r')
fi

ADMIN_PHONE="${ADMIN_PHONE:-7887907363}"
ADMIN_NAME="${ADMIN_NAME:-Owner}"

echo ""
echo "=========================================="
echo "  🍽️  SAI PRASAD — AWS Backend Setup"
echo "=========================================="
echo "  Region: $REGION"
echo "  Account: $ACCOUNT_ID"
echo "  Enforce auth: $ENFORCE_AUTH"
echo "=========================================="
echo ""

# ── STEP 1: Create DynamoDB Tables ──
echo "📦 Step 1: Creating DynamoDB tables..."
if aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION 2>/dev/null >/dev/null; then
    echo "  ✅ Table '$TABLE_NAME' already exists"
else
    aws dynamodb create-table \
        --table-name $TABLE_NAME \
        --attribute-definitions AttributeName=orderId,AttributeType=S \
        --key-schema AttributeName=orderId,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region $REGION \
        --no-cli-pager

    echo "  ⏳ Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name $TABLE_NAME --region $REGION
    echo "  ✅ Table '$TABLE_NAME' created"
fi

if aws dynamodb describe-table --table-name $STAFF_TABLE --region $REGION 2>/dev/null >/dev/null; then
    echo "  ✅ Table '$STAFF_TABLE' already exists"
else
    aws dynamodb create-table \
        --table-name $STAFF_TABLE \
        --attribute-definitions AttributeName=staffId,AttributeType=S \
        --key-schema AttributeName=staffId,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region $REGION \
        --no-cli-pager

    echo "  ⏳ Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name $STAFF_TABLE --region $REGION
    echo "  ✅ Table '$STAFF_TABLE' created"
fi

if aws dynamodb describe-table --table-name $CONFIG_TABLE --region $REGION 2>/dev/null >/dev/null; then
    echo "  ✅ Table '$CONFIG_TABLE' already exists"
else
    aws dynamodb create-table \
        --table-name $CONFIG_TABLE \
        --attribute-definitions AttributeName=configId,AttributeType=S \
        --key-schema AttributeName=configId,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region $REGION \
        --no-cli-pager > /dev/null

    aws dynamodb wait table-exists --table-name $CONFIG_TABLE --region $REGION
    echo "  ✅ Table '$CONFIG_TABLE' created"
fi

if aws dynamodb describe-table --table-name $SUBSCRIBER_TABLE --region $REGION 2>/dev/null >/dev/null; then
    echo "  ✅ Table '$SUBSCRIBER_TABLE' already exists"
else
    aws dynamodb create-table \
        --table-name $SUBSCRIBER_TABLE \
        --attribute-definitions AttributeName=subscriberId,AttributeType=S \
        --key-schema AttributeName=subscriberId,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region $REGION \
        --no-cli-pager > /dev/null

    aws dynamodb wait table-exists --table-name $SUBSCRIBER_TABLE --region $REGION
    echo "  ✅ Table '$SUBSCRIBER_TABLE' created"
fi

if aws dynamodb describe-table --table-name $CUSTOMER_TABLE --region $REGION 2>/dev/null >/dev/null; then
    echo "  ✅ Table '$CUSTOMER_TABLE' already exists"
else
    aws dynamodb create-table \
        --table-name $CUSTOMER_TABLE \
        --attribute-definitions AttributeName=email,AttributeType=S \
        --key-schema AttributeName=email,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region $REGION \
        --no-cli-pager > /dev/null

    aws dynamodb wait table-exists --table-name $CUSTOMER_TABLE --region $REGION
    echo "  ✅ Table '$CUSTOMER_TABLE' created"
fi

# ── STEP 1b: Backfill orderDate, then build the reports index ──
# Orders written before this change have no orderDate, so they would sit
# outside the index and vanish from every report. Patch them first.
echo ""
echo "🗓️  Step 1b: Reports index..."

cd "$(dirname "$0")"

BACKFILL=$(aws dynamodb scan --table-name $TABLE_NAME --region $REGION \
    --projection-expression "orderId,createdAt,orderDate" \
    --output json 2>/dev/null | node backfill-dates.js)

if [ -n "$BACKFILL" ]; then
    COUNT=0
    while IFS=$'\t' read -r ORDER_ID ORDER_DATE; do
        [ -z "$ORDER_ID" ] && continue
        aws dynamodb update-item \
            --table-name $TABLE_NAME \
            --key "{\"orderId\":{\"S\":\"$ORDER_ID\"}}" \
            --update-expression "SET orderDate = :d" \
            --expression-attribute-values "{\":d\":{\"S\":\"$ORDER_DATE\"}}" \
            --region $REGION --no-cli-pager > /dev/null
        COUNT=$((COUNT + 1))
    done <<< "$BACKFILL"
    echo "  ✅ Backfilled orderDate on $COUNT existing order(s)"
else
    echo "  ✅ All orders already have an orderDate"
fi

EMAIL_INDEX="email-index"

HAS_INDEX=$(aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION \
    --query "Table.GlobalSecondaryIndexes[?IndexName=='$DATE_INDEX'].IndexName" \
    --output text 2>/dev/null || echo "")

if [ -n "$HAS_INDEX" ] && [ "$HAS_INDEX" != "None" ]; then
    echo "  ✅ Index '$DATE_INDEX' already exists"
else
    aws dynamodb update-table \
        --table-name $TABLE_NAME \
        --attribute-definitions \
            AttributeName=orderDate,AttributeType=S \
            AttributeName=createdAt,AttributeType=S \
        --global-secondary-index-updates "[{\"Create\":{
            \"IndexName\": \"$DATE_INDEX\",
            \"KeySchema\": [
                {\"AttributeName\":\"orderDate\",\"KeyType\":\"HASH\"},
                {\"AttributeName\":\"createdAt\",\"KeyType\":\"RANGE\"}
            ],
            \"Projection\": {\"ProjectionType\":\"ALL\"}
        }}]" \
        --region $REGION --no-cli-pager > /dev/null

    echo "  ⏳ Building index (this can take a minute)..."
    until [ "$(aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION \
        --query "Table.GlobalSecondaryIndexes[?IndexName=='$DATE_INDEX'].IndexStatus" \
        --output text)" = "ACTIVE" ]; do
        sleep 5
    done
    echo "  ✅ Index '$DATE_INDEX' active"
fi

# A customer opening "My Orders" used to scan the whole table. Indexed, that
# becomes a single lookup no matter how many orders the business has taken.
HAS_EMAIL_INDEX=$(aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION \
    --query "Table.GlobalSecondaryIndexes[?IndexName=='$EMAIL_INDEX'].IndexName" \
    --output text 2>/dev/null || echo "")

if [ -n "$HAS_EMAIL_INDEX" ] && [ "$HAS_EMAIL_INDEX" != "None" ]; then
    echo "  ✅ Index '$EMAIL_INDEX' already exists"
else
    aws dynamodb update-table \
        --table-name $TABLE_NAME \
        --attribute-definitions \
            AttributeName=email,AttributeType=S \
            AttributeName=createdAt,AttributeType=S \
        --global-secondary-index-updates "[{\"Create\":{
            \"IndexName\": \"$EMAIL_INDEX\",
            \"KeySchema\": [
                {\"AttributeName\":\"email\",\"KeyType\":\"HASH\"},
                {\"AttributeName\":\"createdAt\",\"KeyType\":\"RANGE\"}
            ],
            \"Projection\": {\"ProjectionType\":\"ALL\"}
        }}]" \
        --region $REGION --no-cli-pager > /dev/null

    echo "  ⏳ Building '$EMAIL_INDEX'..."
    until [ "$(aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION \
        --query "Table.GlobalSecondaryIndexes[?IndexName=='$EMAIL_INDEX'].IndexStatus" \
        --output text)" = "ACTIVE" ]; do
        sleep 5
    done
    echo "  ✅ Index '$EMAIL_INDEX' active"
fi

# ── STEP 2: Create IAM Role ──
echo ""
echo "🔑 Step 2: Creating IAM role..."

TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}'

if aws iam get-role --role-name $ROLE_NAME 2>/dev/null >/dev/null; then
    echo "  ✅ Role '$ROLE_NAME' already exists"
    ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
else
    ROLE_ARN=$(aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document "$TRUST_POLICY" \
        --query 'Role.Arn' --output text --no-cli-pager)

    # Attach policies
    aws iam attach-role-policy --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

    aws iam attach-role-policy --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

    echo "  ✅ Role created: $ROLE_ARN"
    echo "  ⏳ Waiting 10s for IAM propagation..."
    sleep 10
fi

# ── STEP 3: Token secret (must survive redeploys) ──
echo ""
echo "🔐 Step 3: Resolving token secret..."

EXISTING_SECRET=$(aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME --region $REGION \
    --query 'Environment.Variables.TOKEN_SECRET' --output text 2>/dev/null || echo "None")

if [ -n "$EXISTING_SECRET" ] && [ "$EXISTING_SECRET" != "None" ]; then
    TOKEN_SECRET="$EXISTING_SECRET"
    echo "  ✅ Reusing existing secret (staff stay logged in)"
else
    TOKEN_SECRET=$(openssl rand -hex 32)
    echo "  ✅ Generated a new token secret"
fi

# ── STEP 4: Package & Deploy Lambda ──
echo ""
echo "⚡ Step 4: Deploying Lambda function..."

rm -f /tmp/sai-prasad-lambda.zip
zip -j /tmp/sai-prasad-lambda.zip \
    index.js auth.js db.js defaults.js shop.js admin.js hotel.js delivery.js \
    push.js broadcast.js payments.js customers.js > /dev/null

# Firebase service account for push notifications. Optional: without it the
# API runs exactly as before, just with no app-closed alerts. Pass the path on
# first run, e.g.  FCM_KEY_FILE=~/Downloads/sai-prasad-firebase.json ./deploy.sh
if [ -n "$FCM_KEY_FILE" ] && [ -f "$FCM_KEY_FILE" ]; then
    FCM_SERVICE_ACCOUNT=$(node -e '
      const fs = require("fs");
      const account = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      if (!account.private_key || !account.project_id) {
        console.error("That file is not a Firebase service account key");
        process.exit(1);
      }
      process.stdout.write(JSON.stringify(account));
    ' "$FCM_KEY_FILE")
    echo "  🔔 Push notifications: key loaded for project $(node -e 'console.log(JSON.parse(process.argv[1]).project_id)' "$FCM_SERVICE_ACCOUNT")"
else
    # Preserve whatever is already configured so a normal redeploy never
    # silently switches push off.
    FCM_SERVICE_ACCOUNT=$(aws lambda get-function-configuration \
        --function-name $FUNCTION_NAME --region $REGION \
        --query 'Environment.Variables.FCM_SERVICE_ACCOUNT' --output text 2>/dev/null || echo "")
    [ "$FCM_SERVICE_ACCOUNT" = "None" ] && FCM_SERVICE_ACCOUNT=""
    if [ -n "$FCM_SERVICE_ACCOUNT" ]; then
        echo "  🔔 Push notifications: keeping existing key"
    else
        echo "  🔕 Push notifications: not configured (app-closed alerts off)"
    fi
fi

# JSON form: ALLOWED_ORIGINS contains commas, which the CLI shorthand syntax
# reads as separators between variables.
LAMBDA_ENV=$(node -e '
const [tbl, staff, cfg, subs, cust, secret, gid, origins, enforce, fcm, rzpId, rzpSecret, rzpHook] = process.argv.slice(1);
const vars = {
  TABLE_NAME: tbl, STAFF_TABLE: staff, CONFIG_TABLE: cfg, SUBSCRIBER_TABLE: subs,
  CUSTOMER_TABLE: cust,
  TOKEN_SECRET: secret, GOOGLE_CLIENT_ID: gid,
  ALLOWED_ORIGINS: origins, ENFORCE_AUTH: enforce
};
if (fcm) vars.FCM_SERVICE_ACCOUNT = fcm;
if (rzpId) vars.RAZORPAY_KEY_ID = rzpId;
if (rzpSecret) vars.RAZORPAY_KEY_SECRET = rzpSecret;
if (rzpHook) vars.RAZORPAY_WEBHOOK_SECRET = rzpHook;
console.log(JSON.stringify({ Variables: vars }));' "$TABLE_NAME" "$STAFF_TABLE" "$CONFIG_TABLE" "$SUBSCRIBER_TABLE" "$CUSTOMER_TABLE" "$TOKEN_SECRET" \
   "$GOOGLE_CLIENT_ID" "$ALLOWED_ORIGINS" "$ENFORCE_AUTH" "$FCM_SERVICE_ACCOUNT" \
   "$RAZORPAY_KEY_ID" "$RAZORPAY_KEY_SECRET" "$RAZORPAY_WEBHOOK_SECRET")

if [ -n "$RAZORPAY_KEY_SECRET" ]; then
    echo "  💳 Razorpay: verification enabled for $RAZORPAY_KEY_ID"
else
    echo "  ⚠️  Razorpay: no secret found — online payments will be refused"
fi

if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null >/dev/null; then
    echo "  📦 Updating existing function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb:///tmp/sai-prasad-lambda.zip \
        --region $REGION \
        --no-cli-pager > /dev/null

    aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION

    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --environment "$LAMBDA_ENV" \
        --timeout 300 \
        --memory-size 512 \
        --region $REGION \
        --no-cli-pager > /dev/null

    echo "  ✅ Lambda updated"
else
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs20.x \
        --handler index.handler \
        --role $ROLE_ARN \
        --zip-file fileb:///tmp/sai-prasad-lambda.zip \
        --timeout 300 \
        --memory-size 512 \
        --environment "$LAMBDA_ENV" \
        --region $REGION \
        --no-cli-pager > /dev/null

    echo "  ✅ Lambda created"
fi

aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION

LAMBDA_ARN=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION \
    --query 'Configuration.FunctionArn' --output text)

# Large customer broadcasts are handed to a background invocation of this same
# function, so it needs permission to invoke itself.
aws iam put-role-policy \
    --role-name $ROLE_NAME \
    --policy-name sai-prasad-self-invoke \
    --policy-document "{
        \"Version\": \"2012-10-17\",
        \"Statement\": [{
            \"Effect\": \"Allow\",
            \"Action\": \"lambda:InvokeFunction\",
            \"Resource\": \"$LAMBDA_ARN\"
        }]
    }" --no-cli-pager 2>/dev/null && echo "  ✅ Self-invoke permission set"

# ── STEP 5: Create / update API Gateway (HTTP API v2) ──
echo ""
echo "🌐 Step 5: Configuring API Gateway..."

EXISTING_API=$(aws apigatewayv2 get-apis --region $REGION \
    --query "Items[?Name=='$API_NAME'].ApiId" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_API" ] && [ "$EXISTING_API" != "None" ]; then
    API_ID=$EXISTING_API
    echo "  ✅ API already exists: $API_ID"
else
    API_ID=$(aws apigatewayv2 create-api \
        --name $API_NAME \
        --protocol-type HTTP \
        --region $REGION \
        --query 'ApiId' --output text --no-cli-pager)

    echo "  ✅ API created: $API_ID"

    aws apigatewayv2 create-stage \
        --api-id $API_ID \
        --stage-name '$default' \
        --auto-deploy \
        --region $REGION \
        --no-cli-pager > /dev/null

    aws lambda add-permission \
        --function-name $FUNCTION_NAME \
        --statement-id "apigateway-invoke-${API_ID}" \
        --action "lambda:InvokeFunction" \
        --principal "apigateway.amazonaws.com" \
        --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
        --region $REGION \
        --no-cli-pager > /dev/null 2>&1 || true
fi

# Authorization must be an allowed header, otherwise browsers block every
# authenticated call at the preflight. JSON form, because the shorthand syntax
# cannot express a comma-separated list of origins.
CORS_JSON=$(node -e '
const origins = process.argv[1].split(",");
console.log(JSON.stringify({
  AllowOrigins: origins,
  AllowMethods: ["GET","POST","PATCH","DELETE","OPTIONS"],
  AllowHeaders: ["Content-Type","Authorization"],
  MaxAge: 86400
}));' "$ALLOWED_ORIGINS")

aws apigatewayv2 update-api \
    --api-id $API_ID \
    --cors-configuration "$CORS_JSON" \
    --region $REGION --no-cli-pager > /dev/null
echo "  ✅ CORS origins: $ALLOWED_ORIGINS"

# Reuse the existing Lambda integration if there is one
INTEGRATION_ID=$(aws apigatewayv2 get-integrations --api-id $API_ID --region $REGION \
    --query 'Items[0].IntegrationId' --output text 2>/dev/null || echo "None")

if [ -z "$INTEGRATION_ID" ] || [ "$INTEGRATION_ID" = "None" ]; then
    INTEGRATION_ID=$(aws apigatewayv2 create-integration \
        --api-id $API_ID \
        --integration-type AWS_PROXY \
        --integration-uri $LAMBDA_ARN \
        --payload-format-version "2.0" \
        --region $REGION \
        --query 'IntegrationId' --output text --no-cli-pager)
    echo "  ✅ Integration created: $INTEGRATION_ID"
fi

# Routes are created idempotently, so new endpoints land on existing APIs too
# One route key per line, so the match below can be exact — a substring match
# would treat "GET /orders/{orderId}" as covering "GET /orders".
EXISTING_ROUTES=$(aws apigatewayv2 get-routes --api-id $API_ID --region $REGION \
    --query 'Items[].RouteKey' --output text 2>/dev/null | tr '\t' '\n' || echo "")

# $default catches everything, so admin/hotel/delivery routes need no per-path
# entries here — the Lambda does the routing.
for ROUTE in \
    "\$default" \
    "POST /orders" "GET /orders" "GET /orders/{orderId}" "PATCH /orders/{orderId}" \
    "POST /staff/login" "GET /staff/me" "POST /staff/pin" "POST /staff/device" \
    "POST /auth/customer"; do

    if echo "$EXISTING_ROUTES" | grep -qxF "$ROUTE"; then
        echo "  ↩️  Route exists: $ROUTE"
    else
        aws apigatewayv2 create-route \
            --api-id $API_ID \
            --route-key "$ROUTE" \
            --target "integrations/$INTEGRATION_ID" \
            --region $REGION \
            --no-cli-pager > /dev/null
        echo "  ✅ Route: $ROUTE"
    fi
done

API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com"

# ── STEP 6: Seed the admin account ──
echo ""
echo "👤 Step 6: Seeding admin account..."

ADMIN_EXISTS=$(aws dynamodb scan \
    --table-name $STAFF_TABLE \
    --filter-expression "phone = :p" \
    --expression-attribute-values "{\":p\":{\"S\":\"$ADMIN_PHONE\"}}" \
    --region $REGION --query 'Count' --output text 2>/dev/null || echo "0")

if [ "$ADMIN_EXISTS" != "0" ]; then
    echo "  ✅ Admin $ADMIN_PHONE already exists (PIN unchanged)"
else
    if [ -z "$ADMIN_PIN" ]; then
        echo ""
        read -s -p "  Enter the admin PIN to seed (4-8 digits, hidden): " ADMIN_PIN
        echo ""
    fi

    HASHED=$(node hash-pin.js "$ADMIN_PIN")
    PIN_HASH=$(echo "$HASHED" | sed 's/.*"hash":"\([^"]*\)".*/\1/')
    PIN_SALT=$(echo "$HASHED" | sed 's/.*"salt":"\([^"]*\)".*/\1/')
    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    aws dynamodb put-item \
        --table-name $STAFF_TABLE \
        --item "{
            \"staffId\": {\"S\": \"admin-$ADMIN_PHONE\"},
            \"name\": {\"S\": \"$ADMIN_NAME\"},
            \"phone\": {\"S\": \"$ADMIN_PHONE\"},
            \"role\": {\"S\": \"admin\"},
            \"pinHash\": {\"S\": \"$PIN_HASH\"},
            \"pinSalt\": {\"S\": \"$PIN_SALT\"},
            \"active\": {\"BOOL\": true},
            \"failedAttempts\": {\"N\": \"0\"},
            \"createdAt\": {\"S\": \"$NOW\"}
        }" \
        --condition-expression "attribute_not_exists(staffId)" \
        --region $REGION --no-cli-pager

    unset ADMIN_PIN
    echo "  ✅ Admin account created for $ADMIN_PHONE"
fi

# ── STEP 7: Seed shop + menu config ──
echo ""
echo "🍽️  Step 7: Seeding shop config and menu..."

node seed-config.js /tmp/sai-prasad-config > /dev/null

# attribute_not_exists means a re-deploy never overwrites the admin's own
# price changes or opening hours.
for PART in shop menu; do
    if aws dynamodb put-item \
        --table-name $CONFIG_TABLE \
        --item "file:///tmp/sai-prasad-config-$PART.json" \
        --condition-expression "attribute_not_exists(configId)" \
        --region $REGION --no-cli-pager 2>/dev/null; then
        echo "  ✅ Seeded '$PART' config"
    else
        echo "  ↩️  '$PART' config already set (left untouched)"
    fi
done

rm -f /tmp/sai-prasad-config-shop.json /tmp/sai-prasad-config-menu.json

echo ""
echo "=========================================="
echo "  ✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "  🌐 API URL: $API_URL"
echo ""
echo "  Public:"
echo "    POST   $API_URL/orders          — Create order"
echo "    GET    $API_URL/orders/{id}     — Track (redacted unless signed in)"
echo "    POST   $API_URL/auth/customer   — Google token → customer token"
echo ""
echo "  Staff (Bearer token required):"
echo "    POST   $API_URL/staff/login     — Phone + PIN → token"
echo "    GET    $API_URL/staff/me        — Validate token"
echo "    POST   $API_URL/staff/pin       — Change own PIN"
echo "    GET    $API_URL/orders          — Full order list"
echo "    PATCH  $API_URL/orders/{id}     — Update order"
echo ""
if [ "$ENFORCE_AUTH" != "true" ]; then
echo "  ⚠️  ENFORCE_AUTH=false — legacy unauthenticated calls still work."
echo "      Watch for 'LEGACY_UNAUTH' in CloudWatch logs to see what still"
echo "      needs updating, then redeploy with:  ENFORCE_AUTH=true ./deploy.sh"
echo ""
fi
echo "=========================================="

echo "$API_URL" > "$(dirname "$0")/../api_url.txt"
echo ""
echo "  📁 API URL saved to api_url.txt"
