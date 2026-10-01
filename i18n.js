/**
 * i18n.js — Multi-language support for Aapla Swad
 * Supports: English (en), Hindi (hi), Marathi (mr)
 * 
 * Usage:
 *   1. Include this script in every page: <script src="i18n.js"></script>
 *   2. Add data-i18n="key" to HTML elements for auto-translation
 *   3. Use t('key') in JavaScript for dynamic text
 *   4. Call applyLanguage() after DOM is ready
 */

const TRANSLATIONS = {
    // ══════════ NAVBAR & NAVIGATION ══════════
    nav_home:       { en: 'Home',       hi: 'होम',        mr: 'होम' },
    nav_order:      { en: 'Order',      hi: 'ऑर्डर',     mr: 'ऑर्डर' },
    nav_track:      { en: 'Track',      hi: 'ट्रैक',     mr: 'ट्रॅक' },
    nav_profile:    { en: 'Profile',    hi: 'प्रोफ़ाइल',  mr: 'प्रोफाइल' },

    // ══════════ INDEX / HOME PAGE ══════════
    tagline:            { en: 'Authentic Rajasthani Dal Bati Churma', hi: 'असली राजस्थानी दाल बाटी चूरमा', mr: 'खरी राजस्थानी दाल बाटी चूरमा' },
    order_now_btn:      { en: 'Order Now — View Menu', hi: 'अभी ऑर्डर करें — मेनू देखें', mr: 'आता ऑर्डर करा — मेनू पहा' },
    open_status:        { en: 'Open',  hi: 'खुला है',  mr: 'सुरू आहे' },
    closed_status:      { en: 'Closed', hi: 'बंद है',   mr: 'बंद आहे' },
    closed_msg:         { en: "We're closed right now", hi: 'अभी बंद है',  mr: 'सध्या बंद आहे' },
    open_hours:         { en: 'Open daily 10:00 AM – 10:00 PM', hi: 'रोज़ सुबह 10 – रात 10 बजे तक', mr: 'रोज सकाळी 10 – रात्री 10 वाजेपर्यंत' },
    orders_today:       { en: 'orders today', hi: 'आज के ऑर्डर', mr: 'आजचे ऑर्डर' },
    delivery_time:      { en: '~25-35 min delivery', hi: '~25-35 मिनट डिलीवरी', mr: '~25-35 मिनिटे डिलिव्हरी' },
    customer_love:      { en: 'Customer Love', hi: 'ग्राहकों की पसंद', mr: 'ग्राहकांची पसंती' },
    pure_veg_badge:     { en: 'Pure Veg', hi: 'शुद्ध शाकाहारी', mr: 'शुद्ध शाकाहारी' },
    delivery_30min:     { en: '30 min delivery', hi: '30 मिनट डिलीवरी', mr: '30 मिनिटे डिलिव्हरी' },
    first_order_promo:  { en: 'First Order? Get 10% OFF!', hi: 'पहला ऑर्डर? 10% छूट पाएं!', mr: 'पहिला ऑर्डर? 10% सूट मिळवा!' },
    promo_sub:          { en: 'Auto-applied at checkout • No code needed', hi: 'चेकआउट पर अपने आप लागू • कोड नहीं चाहिए', mr: 'चेकआउटला आपोआप लागू • कोड नको' },
    nonveg_thalis:      { en: 'Non-Veg Thalis', hi: 'मांसाहारी थाली', mr: 'मांसाहारी थाळी' },
    copy:               { en: 'Copy', hi: 'कॉपी', mr: 'कॉपी' },
    refer_earn:         { en: 'Refer & Earn ₹20', hi: 'रेफर करें और ₹20 कमाएं', mr: 'रेफर करा आणि ₹20 कमवा' },
    download_app:       { en: 'Download App', hi: 'ऐप डाउनलोड करें', mr: 'अॅप डाउनलोड करा' },
    share:              { en: 'Share', hi: 'शेयर करें', mr: 'शेअर करा' },
    refer_earn:         { en: 'Refer & Earn ₹20', hi: 'रेफर करें और ₹20 कमाएं', mr: 'रेफर करा आणि ₹20 कमवा' },
    refer_sub:          { en: 'Share your code • Both you & your friend get ₹20 off', hi: 'अपना कोड शेयर करें • आपको और आपके दोस्त दोनों को ₹20 की छूट', mr: 'तुमचा कोड शेअर करा • तुम्हाला आणि तुमच्या मित्राला दोघांना ₹20 सूट' },
    copy:               { en: 'Copy', hi: 'कॉपी', mr: 'कॉपी' },
    copied:             { en: 'Copied!', hi: 'कॉपी हो गया!', mr: 'कॉपी झालं!' },
    install:            { en: 'Install', hi: 'इंस्टॉल', mr: 'इंस्टॉल' },
    get_app:            { en: 'Get the Aapla Swad app', hi: 'Aapla Swad ऐप डाउनलोड करें', mr: 'Aapla Swad अॅप डाउनलोड करा' },
    faster_ordering:    { en: 'Faster ordering & live tracking', hi: 'तेज़ ऑर्डरिंग और लाइव ट्रैकिंग', mr: 'जलद ऑर्डरिंग आणि लाइव्ह ट्रॅकिंग' },

    // Mini cards
    home_cooked:    { en: 'Home Cooked', hi: 'घर का बना', mr: 'घरचं बनवलेलं' },
    fresh_daily:    { en: 'Fresh Daily', hi: 'रोज़ ताज़ा', mr: 'रोज ताजं' },
    pure_ghee:      { en: 'Pure Ghee', hi: 'शुद्ध घी', mr: 'शुद्ध तूप' },
    desi_style:     { en: 'Desi Style', hi: 'देसी स्टाइल', mr: 'देशी पद्धत' },
    wood_fire:      { en: 'Wood Fire', hi: 'लकड़ी की आग', mr: 'लाकडाची आग' },
    baked:          { en: 'Baked', hi: 'से पका हुआ', mr: 'वर भाजलेलं' },
    free_churma:    { en: 'Free Churma', hi: 'मुफ्त चूरमा', mr: 'मोफत चूरमा' },
    included:       { en: 'Included', hi: 'शामिल', mr: 'समाविष्ट' },

    // Reviews
    review1:        { en: 'Best dal bati in the city! Tastes just like homemade. The ghee is so pure 🧈', hi: 'शहर की सबसे अच्छी दाल बाटी! बिल्कुल घर जैसा स्वाद। घी बहुत शुद्ध है 🧈', mr: 'शहरातली सर्वोत्तम दाल बाटी! अगदी घरच्यासारखी चव. तूप खूप शुद्ध आहे 🧈' },
    review2:        { en: 'Delivered hot & fresh within 30 mins. Churma was amazing! Will order again 😋', hi: '30 मिनट में गरम और ताज़ा डिलीवर हुआ। चूरमा लाजवाब था! फिर ऑर्डर करूंगा 😋', mr: '30 मिनिटात गरम आणि ताजं डिलिव्हर झालं. चूरमा अप्रतिम होता! पुन्हा ऑर्डर करेन 😋' },
    review3:        { en: '₹80 for this quality is a steal! Ordering every weekend now. 10/10 recommend 🔥', hi: '₹80 में इतनी क्वालिटी! हर वीकेंड ऑर्डर कर रहा हूं। 10/10 रिकमेंड 🔥', mr: '₹80 मध्ये इतका दर्जा! दर वीकेंडला ऑर्डर करतोय. 10/10 शिफारस 🔥' },
    review4:        { en: 'My family loved it! Authentic Rajasthani taste. The bati was perfectly crispy 👌', hi: 'मेरे परिवार को बहुत पसंद आया! असली राजस्थानी स्वाद। बाटी बिल्कुल कुरकुरी थी 👌', mr: 'माझ्या कुटुंबाला खूप आवडलं! खरी राजस्थानी चव. बाटी एकदम कुरकुरीत होती 👌' },

    // Promo
    first_order_free:   { en: 'First Order Free Delivery!', hi: 'पहले ऑर्डर पर फ्री डिलीवरी!', mr: 'पहिल्या ऑर्डरवर मोफत डिलिव्हरी!' },
    promo_desc:         { en: 'Use code FIRST20 for ₹20 off', hi: 'FIRST20 कोड से ₹20 की छूट पाएं', mr: 'FIRST20 कोड वापरून ₹20 सूट मिळवा' },

    // Non-veg section
    nonveg_thalis:  { en: 'Non-Veg Thalis', hi: 'नॉन-वेज थाली', mr: 'नॉन-व्हेज थाळी' },

    // ══════════ DISH PAGE ══════════
    add_to_cart:    { en: 'Add to Cart', hi: 'कार्ट में डालें', mr: 'कार्टमध्ये टाका' },
    go_to_cart:     { en: 'Go to Cart', hi: 'कार्ट पर जाएं', mr: 'कार्टवर जा' },
    extras:         { en: 'Add Extras', hi: 'एक्स्ट्रा जोड़ें', mr: 'एक्स्ट्रा जोडा' },
    qty:            { en: 'Qty', hi: 'मात्रा', mr: 'संख्या' },
    includes:       { en: 'Includes', hi: 'शामिल है', mr: 'समाविष्ट आहे' },
    back:           { en: 'Back', hi: 'वापस', mr: 'मागे' },

    // ══════════ ORDER PAGE ══════════
    your_cart:      { en: 'Your Cart', hi: 'आपकी कार्ट', mr: 'तुमची कार्ट' },
    cart_empty:     { en: 'Your cart is empty', hi: 'आपकी कार्ट खाली है', mr: 'तुमची कार्ट रिकामी आहे' },
    browse_menu:    { en: 'Browse Menu', hi: 'मेनू देखें', mr: 'मेनू पहा' },
    delivery_addr:  { en: 'Delivery Address', hi: 'डिलीवरी पता', mr: 'डिलिव्हरी पत्ता' },
    enter_address:  { en: 'Enter your full address...', hi: 'अपना पूरा पता लिखें...', mr: 'तुमचा पूर्ण पत्ता लिहा...' },
    landmark:       { en: 'Landmark (optional)', hi: 'लैंडमार्क (वैकल्पिक)', mr: 'लँडमार्क (ऐच्छिक)' },
    enter_landmark: { en: 'Near temple, shop, etc.', hi: 'मंदिर, दुकान आदि के पास', mr: 'मंदिर, दुकान इत्यादीजवळ' },
    phone:          { en: 'Phone Number', hi: 'फ़ोन नंबर', mr: 'फोन नंबर' },
    enter_phone:    { en: 'Your 10-digit number', hi: 'आपका 10 अंक का नंबर', mr: 'तुमचा 10 अंकी नंबर' },
    detect_loc:     { en: 'Detect Location', hi: 'लोकेशन पता करें', mr: 'लोकेशन शोधा' },
    detecting:      { en: 'Detecting…', hi: 'पता लगा रहे हैं…', mr: 'शोधत आहे…' },
    payment_method: { en: 'Payment Method', hi: 'भुगतान का तरीका', mr: 'पेमेंट पद्धत' },
    pay_online:     { en: 'Pay Online (UPI)', hi: 'ऑनलाइन पे करें (UPI)', mr: 'ऑनलाइन पे करा (UPI)' },
    cash_on_del:    { en: 'Cash on Delivery', hi: 'कैश ऑन डिलीवरी', mr: 'कॅश ऑन डिलिव्हरी' },
    subtotal:       { en: 'Subtotal', hi: 'सबटोटल', mr: 'उपएकूण' },
    delivery_fee:   { en: 'Delivery Fee', hi: 'डिलीवरी शुल्क', mr: 'डिलिव्हरी शुल्क' },
    total:          { en: 'Total', hi: 'कुल', mr: 'एकूण' },
    free:           { en: 'FREE', hi: 'मुफ्त', mr: 'मोफत' },
    place_order:    { en: 'Place Order', hi: 'ऑर्डर करें', mr: 'ऑर्डर द्या' },
    placing:        { en: 'Placing…', hi: 'ऑर्डर हो रहा है…', mr: 'ऑर्डर होत आहे…' },
    sign_in_order:  { en: 'Sign in to order & track your food', hi: 'ऑर्डर और ट्रैक करने के लिए साइन इन करें', mr: 'ऑर्डर आणि ट्रॅक करण्यासाठी साइन इन करा' },
    full_name:      { en: 'Full Name', hi: 'पूरा नाम', mr: 'पूर्ण नाव' },

    // ══════════ DISH NAMES ══════════
    'dish_dal-bati':            { en: 'Normal Dal Batti', hi: 'नॉर्मल दाल बट्टी', mr: 'नॉर्मल दाल बट्टी' },
    'dish_zunka-bhakar':        { en: 'Zunka Bhakar Thali', hi: 'झुणका भाकर थाली', mr: 'झुणका भाकर थाळी' },
    'dish_bharit-bhakar':       { en: 'Bharit Bhakar Thali', hi: 'भरीत भाकर थाली', mr: 'भरीत भाकर थाळी' },
    'dish_special-dal-batti':   { en: 'Special Dal Batti Thali', hi: 'स्पेशल दाल बट्टी थाली', mr: 'स्पेशल दाल बट्टी थाळी' },
    'dish_bombil-thali':        { en: 'Bombil Thali', hi: 'बोंबिल थाली', mr: 'बोंबील थाळी' },
    'dish_zinga-thali':         { en: 'Zinga Thali', hi: 'झिंगा थाली', mr: 'झिंगा थाळी' },
    'dish_chicken-thali':       { en: 'Chicken Thali', hi: 'चिकन थाली', mr: 'चिकन थाळी' },

    // ══════════ DISH SHORT NAMES ══════════
    'short_dal-bati':           { en: 'Dal Batti', hi: 'दाल बट्टी', mr: 'दाल बट्टी' },
    'short_zunka-bhakar':       { en: 'Zunka Bhakar', hi: 'झुणका भाकर', mr: 'झुणका भाकर' },
    'short_bharit-bhakar':      { en: 'Bharit Bhakar', hi: 'भरीत भाकर', mr: 'भरीत भाकर' },
    'short_special-dal-batti':  { en: 'Spl Dal Batti', hi: 'स्पे. दाल बट्टी', mr: 'स्पे. दाल बट्टी' },
    'short_bombil-thali':       { en: 'Bombil', hi: 'बोंबिल', mr: 'बोंबील' },
    'short_zinga-thali':        { en: 'Zinga', hi: 'झिंगा', mr: 'झिंगा' },
    'short_chicken-thali':      { en: 'Chicken', hi: 'चिकन', mr: 'चिकन' },

    // ══════════ DISH DESCRIPTIONS (includes) ══════════
    'desc_dal-bati':            { en: '8 batti • onion • lemon • dal • thecha • loncha', hi: '8 बट्टी • कांदा • लिंबू • दाल • ठेचा • लोणचं', mr: '8 बट्टी • कांदा • लिंबू • दाल • ठेचा • लोणचं' },
    'desc_zunka-bhakar':        { en: '2 bhakri • zunka • onion • chili • pickle', hi: '2 भाकरी • झुणका • प्याज • मिर्ची • अचार', mr: '2 भाकरी • झुणका • कांदा • मिरची • लोणचं' },
    'desc_bharit-bhakar':       { en: 'bharit • 2 bhakar • onion • lemon • aachar • thecha', hi: 'भरीत • 2 भाकर • प्याज • नींबू • अचार • ठेचा', mr: 'भरीत • 2 भाकर • कांदा • लिंबू • लोणचं • ठेचा' },
    'desc_special-dal-batti':   { en: '8 pcs batti • dal • sweet • onion • lemon', hi: '8 बट्टी • दाल • मिठाई • प्याज • नींबू', mr: '8 बट्टी • दाल • गोड • कांदा • लिंबू' },
    'desc_bombil-thali':        { en: '6 pcs bombil • rassa • rice • 2 bhakar • onion • lemon', hi: '6 बोंबिल • रस्सा • चावल • 2 भाकर • प्याज • नींबू', mr: '6 बोंबील • रस्सा • भात • 2 भाकर • कांदा • लिंबू' },
    'desc_zinga-thali':         { en: 'zinga chatni • 2 bhakar • onion • lemon', hi: 'झिंगा चटनी • 2 भाकर • प्याज • नींबू', mr: 'झिंगा चटणी • 2 भाकर • कांदा • लिंबू' },
    'desc_chicken-thali':       { en: '4 pcs chicken • rassa • rice • 2 bhakari • onion • lemon', hi: '4 चिकन • रस्सा • चावल • 2 भाकरी • प्याज • नींबू', mr: '4 चिकन • रस्सा • भात • 2 भाकरी • कांदा • लिंबू' },

    // ══════════ EXTRAS ══════════
    'extra_ghee':       { en: 'Extra Ghee', hi: 'एक्स्ट्रा घी', mr: 'एक्स्ट्रा तूप' },
    'extra_churma':     { en: 'Extra Churma', hi: 'एक्स्ट्रा चूरमा', mr: 'एक्स्ट्रा चूरमा' },
    'extra_bati':       { en: '2 Extra Bati', hi: '2 एक्स्ट्रा बाटी', mr: '2 एक्स्ट्रा बाटी' },
    'extra_onion':      { en: 'Extra Onion Salad', hi: 'एक्स्ट्रा प्याज सलाद', mr: 'एक्स्ट्रा कांदा सॅलड' },
    'extra_bhakri':     { en: '2 Extra Bhakri', hi: '2 एक्स्ट्रा भाकरी', mr: '2 एक्स्ट्रा भाकरी' },
    'extra_bhakar':     { en: '2 Extra Bhakar', hi: '2 एक्स्ट्रा भाकर', mr: '2 एक्स्ट्रा भाकर' },
    'extra_thecha':     { en: 'Extra Thecha', hi: 'एक्स्ट्रा ठेचा', mr: 'एक्स्ट्रा ठेचा' },
    'extra_rice':       { en: 'Extra Rice', hi: 'एक्स्ट्रा चावल', mr: 'एक्स्ट्रा भात' },
    'extra_bombil':     { en: 'Extra Bombil (3 pcs)', hi: 'एक्स्ट्रा बोंबिल (3 पीस)', mr: 'एक्स्ट्रा बोंबील (3 नग)' },
    'extra_zinga':      { en: 'Extra Zinga', hi: 'एक्स्ट्रा झिंगा', mr: 'एक्स्ट्रा झिंगा' },
    'extra_bhakari':    { en: '2 Extra Bhakari', hi: '2 एक्स्ट्रा भाकरी', mr: '2 एक्स्ट्रा भाकरी' },
    'extra_chicken':    { en: 'Extra Chicken (2 pcs)', hi: 'एक्स्ट्रा चिकन (2 पीस)', mr: 'एक्स्ट्रा चिकन (2 नग)' },
    'extra_batti':      { en: '4 Extra Batti', hi: '4 एक्स्ट्रा बट्टी', mr: '4 एक्स्ट्रा बट्टी' },
    'extra_sweet':      { en: 'Extra Sweet', hi: 'एक्स्ट्रा मिठाई', mr: 'एक्स्ट्रा गोड' },

    // ══════════ CART / ORDER UI ══════════
    add_btn:        { en: 'ADD', hi: 'डालें', mr: 'टाका' },
    sold_out:       { en: 'SOLD OUT', hi: 'बिक गया', mr: 'संपलं' },
    add_extras_colon:{ en: 'Add extras:', hi: 'एक्स्ट्रा जोड़ें:', mr: 'एक्स्ट्रा जोडा:' },
    your_cart:      { en: 'YOUR CART', hi: 'आपकी कार्ट', mr: 'तुमची कार्ट' },
    items_ready:    { en: 'items ready to order', hi: 'ऑर्डर के लिए तैयार', mr: 'ऑर्डरसाठी तयार' },
    add_more:       { en: 'Want to add more items?', hi: 'और आइटम जोड़ना है?', mr: 'आणखी आयटम जोडायचे?' },
    veg_label:      { en: 'VEG', hi: 'शाकाहारी', mr: 'शाकाहारी' },
    nonveg_label:   { en: 'NON-VEG', hi: 'मांसाहारी', mr: 'मांसाहारी' },
    // ══════════ ORDER SUCCESS ══════════
    order_placed:       { en: 'Order Placed!', hi: 'ऑर्डर हो गया!', mr: 'ऑर्डर झाला!' },
    order_confirmed:    { en: 'Your order is confirmed', hi: 'आपका ऑर्डर कन्फर्म हो गया', mr: 'तुमचा ऑर्डर कन्फर्म झाला' },
    delivery_code:      { en: 'Delivery Code', hi: 'डिलीवरी कोड', mr: 'डिलिव्हरी कोड' },
    delivery_code_msg:  { en: 'Show this code to the delivery person', hi: 'यह कोड डिलीवरी वाले को दिखाएं', mr: 'हा कोड डिलिव्हरी व्यक्तीला दाखवा' },
    track_order:        { en: 'Track Order', hi: 'ऑर्डर ट्रैक करें', mr: 'ऑर्डर ट्रॅक करा' },
    order_more:         { en: 'Order More', hi: 'और ऑर्डर करें', mr: 'आणखी ऑर्डर करा' },

    // ══════════ TRACK PAGE ══════════
    track_your_order:   { en: 'Track Your Order', hi: 'अपना ऑर्डर ट्रैक करें', mr: 'तुमचा ऑर्डर ट्रॅक करा' },
    order_id:           { en: 'Order ID', hi: 'ऑर्डर ID', mr: 'ऑर्डर ID' },
    status:             { en: 'Status', hi: 'स्थिति', mr: 'स्थिती' },
    pending:            { en: 'Order Received', hi: 'ऑर्डर मिला', mr: 'ऑर्डर मिळाला' },
    confirmed:          { en: 'Confirmed', hi: 'कन्फर्म हुआ', mr: 'कन्फर्म झाला' },
    preparing:          { en: 'Being Prepared', hi: 'तैयार हो रहा है', mr: 'तयार होत आहे' },
    ready:              { en: 'Ready', hi: 'तैयार है', mr: 'तयार आहे' },
    picked_up:          { en: 'Out for Delivery', hi: 'डिलीवरी के लिए निकला', mr: 'डिलिव्हरीसाठी निघाले' },
    delivered:          { en: 'Delivered', hi: 'डिलीवर हो गया', mr: 'डिलिव्हर झाला' },
    cancelled:          { en: 'Cancelled', hi: 'कैंसल हो गया', mr: 'कॅन्सल झाला' },
    your_delivery_code: { en: 'Your Delivery Code', hi: 'आपका डिलीवरी कोड', mr: 'तुमचा डिलिव्हरी कोड' },
    show_to_driver:     { en: 'Show this to the delivery partner', hi: 'यह डिलीवरी पार्टनर को दिखाएं', mr: 'हे डिलिव्हरी पार्टनरला दाखवा' },
    call_driver:        { en: 'Call Driver', hi: 'ड्राइवर को कॉल करें', mr: 'ड्रायव्हरला कॉल करा' },
    est_delivery:       { en: 'Estimated Delivery', hi: 'अनुमानित डिलीवरी', mr: 'अंदाजे डिलिव्हरी' },
    minutes:            { en: 'minutes', hi: 'मिनट', mr: 'मिनिटे' },
    items_ordered:      { en: 'Items Ordered', hi: 'ऑर्डर किए गए आइटम', mr: 'ऑर्डर केलेल्या वस्तू' },
    no_active_order:    { en: 'No active orders found', hi: 'कोई एक्टिव ऑर्डर नहीं मिला', mr: 'कोणताही सक्रिय ऑर्डर सापडला नाही' },

    // ══════════ PROFILE PAGE ══════════
    my_profile:     { en: 'My Profile', hi: 'मेरी प्रोफ़ाइल', mr: 'माझी प्रोफाइल' },
    order_now:      { en: 'Order Now', hi: 'अभी ऑर्डर करें', mr: 'आता ऑर्डर करा' },
    order_now_arrow:{ en: 'Order Now →', hi: 'अभी ऑर्डर करें →', mr: 'आता ऑर्डर करा →' },
    sign_in_profile:{ en: 'Sign in to view your profile', hi: 'प्रोफ़ाइल देखने के लिए साइन इन करें', mr: 'प्रोफाइल पाहण्यासाठी साइन इन करा' },
    sign_in_desc:   { en: 'Sign in with Google to see your orders and account', hi: 'ऑर्डर और अकाउंट देखने के लिए Google से साइन इन करें', mr: 'ऑर्डर आणि अकाउंट पाहण्यासाठी Google ने साइन इन करा' },
    verified_google:{ en: 'Verified with Google', hi: 'Google से वेरिफाइड', mr: 'Google ने व्हेरिफाइड' },
    orders_stat:    { en: 'Orders', hi: 'ऑर्डर', mr: 'ऑर्डर' },
    total_spent:    { en: 'Total Spent', hi: 'कुल खर्च', mr: 'एकूण खर्च' },
    active_stat:    { en: 'Active', hi: 'सक्रिय', mr: 'सक्रिय' },
    dal_bati_churma:{ en: 'Dal Bati Churma', hi: 'दाल बाटी चूरमा', mr: 'दाल बाटी चूरमा' },
    live_status:    { en: 'Live status', hi: 'लाइव स्थिति', mr: 'लाइव्ह स्थिती' },
    loyalty_stamps: { en: 'Loyalty Stamps', hi: 'लॉयल्टी स्टैम्प', mr: 'लॉयल्टी स्टॅम्प' },
    collect_5:      { en: 'Collect 5 stamps for a FREE thali!', hi: '5 स्टैम्प इकट्ठा करें और मुफ्त थाली पाएं!', mr: '5 स्टॅम्प गोळा करा आणि मोफत थाळी मिळवा!' },
    share_friends:  { en: 'Share Aapla Swad with Friends', hi: 'Aapla Swad दोस्तों से शेयर करें', mr: 'Aapla Swad मित्रांसोबत शेअर करा' },
    my_orders:      { en: 'My Orders', hi: 'मेरे ऑर्डर', mr: 'माझे ऑर्डर' },
    loading_orders: { en: 'Loading your orders...', hi: 'आपके ऑर्डर लोड हो रहे हैं...', mr: 'तुमचे ऑर्डर लोड होत आहेत...' },
    sign_out_btn:   { en: 'Sign Out', hi: 'साइन आउट', mr: 'साइन आउट' },
    sign_in:        { en: 'Sign in with Google', hi: 'Google से साइन इन करें', mr: 'Google ने साइन इन करा' },
    sign_out:       { en: 'Sign Out', hi: 'साइन आउट', mr: 'साइन आउट' },
    no_orders:      { en: 'No orders yet', hi: 'अभी तक कोई ऑर्डर नहीं', mr: 'अजून कोणताही ऑर्डर नाही' },
    order_history:  { en: 'Order History', hi: 'ऑर्डर इतिहास', mr: 'ऑर्डर इतिहास' },
    share_app_title:{ en: 'Share App', hi: 'ऐप शेयर करें', mr: 'अॅप शेअर करा' },
    referral_code:  { en: 'Referral Code', hi: 'रेफरल कोड', mr: 'रेफरल कोड' },
    ref_share_sub:  { en: 'Share your code • Both get ₹20 off', hi: 'कोड शेयर करें • दोनों को ₹20 छूट', mr: 'कोड शेअर करा • दोघांना ₹20 सूट' },

    // ══════════ TRACK PAGE ══════════
    my_orders_tab:      { en: 'My Orders', hi: 'मेरे ऑर्डर', mr: 'माझे ऑर्डर' },
    track_by_id:        { en: 'Track by ID', hi: 'ID से ट्रैक करें', mr: 'ID ने ट्रॅक करा' },
    new_order:          { en: '+ New Order', hi: '+ नया ऑर्डर', mr: '+ नवीन ऑर्डर' },
    track_your_order:   { en: 'Track Your Order', hi: 'अपना ऑर्डर ट्रैक करें', mr: 'तुमचा ऑर्डर ट्रॅक करा' },
    enter_order_id:     { en: 'Enter your order ID to check status', hi: 'स्थिति जानने के लिए ऑर्डर ID डालें', mr: 'स्थिती जाणण्यासाठी ऑर्डर ID टाका' },
    track_btn:          { en: 'Track', hi: 'ट्रैक करें', mr: 'ट्रॅक करा' },
    order_not_found:    { en: 'Order not found. Check your ID.', hi: 'ऑर्डर नहीं मिला। ID चेक करें।', mr: 'ऑर्डर सापडला नाही. ID तपासा.' },
    arriving_in:        { en: 'ARRIVING IN', hi: 'पहुँचने में', mr: 'पोहोचण्यास' },
    call_delivery:      { en: 'Call the delivery partner', hi: 'डिलीवरी पार्टनर को कॉल करें', mr: 'डिलिव्हरी पार्टनरला कॉल करा' },
    delivery_code:      { en: 'DELIVERY CODE', hi: 'डिलीवरी कोड', mr: 'डिलिव्हरी कोड' },
    tell_delivery:      { en: 'Tell this to the delivery partner', hi: 'यह डिलीवरी पार्टनर को बताएं', mr: 'हे डिलिव्हरी पार्टनरला सांगा' },
    quantity_label:     { en: 'Quantity', hi: 'मात्रा', mr: 'संख्या' },
    payment_label:      { en: 'Payment', hi: 'भुगतान', mr: 'पेमेंट' },
    ordered_at:         { en: 'Ordered at', hi: 'ऑर्डर समय', mr: 'ऑर्डर वेळ' },
    order_id:           { en: 'Order ID', hi: 'ऑर्डर ID', mr: 'ऑर्डर ID' },
    status:             { en: 'Status', hi: 'स्थिति', mr: 'स्थिती' },
    pending:            { en: 'Order Received', hi: 'ऑर्डर मिला', mr: 'ऑर्डर मिळाला' },
    confirmed:          { en: 'Confirmed', hi: 'कन्फर्म हुआ', mr: 'कन्फर्म झाला' },
    preparing:          { en: 'Being Prepared', hi: 'तैयार हो रहा है', mr: 'तयार होत आहे' },
    ready:              { en: 'Ready', hi: 'तैयार है', mr: 'तयार आहे' },
    picked_up:          { en: 'Out for Delivery', hi: 'डिलीवरी के लिए निकला', mr: 'डिलिव्हरीसाठी निघाले' },
    delivered:          { en: 'Delivered', hi: 'डिलीवर हो गया', mr: 'डिलिव्हर झाला' },
    cancelled:          { en: 'Cancelled', hi: 'कैंसल हो गया', mr: 'कॅन्सल झाला' },
    no_active_order:    { en: 'No active orders found', hi: 'कोई एक्टिव ऑर्डर नहीं मिला', mr: 'कोणताही सक्रिय ऑर्डर सापडला नाही' },
    sign_out_track:     { en: 'Sign out', hi: 'साइन आउट', mr: 'साइन आउट' },

    // Timeline steps
    tl_placed:      { en: 'Order Placed', hi: 'ऑर्डर हो गया', mr: 'ऑर्डर झाला' },
    tl_placed_sub:  { en: 'We received your order', hi: 'हमें आपका ऑर्डर मिल गया', mr: 'आम्हाला तुमचा ऑर्डर मिळाला' },
    tl_confirmed:   { en: 'Confirmed', hi: 'कन्फर्म', mr: 'कन्फर्म' },
    tl_confirmed_sub:{ en: 'Order accepted by restaurant', hi: 'रेस्टोरेंट ने ऑर्डर स्वीकार किया', mr: 'रेस्टॉरंटने ऑर्डर स्वीकारला' },
    tl_preparing:   { en: 'Preparing', hi: 'तैयार हो रहा है', mr: 'तयार होत आहे' },
    tl_preparing_sub:{ en: 'Your food is being prepared', hi: 'आपका खाना तैयार हो रहा है', mr: 'तुमचं जेवण तयार होत आहे' },
    tl_ready:       { en: 'Ready', hi: 'तैयार', mr: 'तयार' },
    tl_ready_sub:   { en: 'Ready for pickup', hi: 'पिकअप के लिए तैयार', mr: 'पिकअपसाठी तयार' },
    tl_picked:      { en: 'Out for Delivery', hi: 'डिलीवरी के लिए रवाना', mr: 'डिलिव्हरीसाठी निघाले' },
    tl_picked_sub:  { en: 'Your food is on its way!', hi: 'आपका खाना रास्ते में है!', mr: 'तुमचं जेवण वाटेवर आहे!' },
    tl_delivered:   { en: 'Delivered', hi: 'डिलीवर हो गया', mr: 'डिलिव्हर झाला' },
    tl_delivered_sub:{ en: 'Enjoy your meal!', hi: 'खाने का आनंद लें!', mr: 'जेवणाचा आनंद घ्या!' },

    // ══════════ DISH PAGE ══════════
    add_to_cart:    { en: 'Add to Cart', hi: 'कार्ट में डालें', mr: 'कार्टमध्ये टाका' },
    go_to_cart:     { en: 'Go to Cart', hi: 'कार्ट पर जाएं', mr: 'कार्टवर जा' },
    add_extras:     { en: 'Add Extras', hi: 'एक्स्ट्रा जोड़ें', mr: 'एक्स्ट्रा जोडा' },
    qty:            { en: 'Qty', hi: 'मात्रा', mr: 'संख्या' },
    includes:       { en: 'Includes', hi: 'शामिल है', mr: 'समाविष्ट आहे' },
    back:           { en: 'Back', hi: 'वापस', mr: 'मागे' },
    view_menu:      { en: 'View Full Menu', hi: 'पूरा मेनू देखें', mr: 'संपूर्ण मेनू पहा' },
    added:          { en: 'Added!', hi: 'जोड़ा गया!', mr: 'जोडलं!' },
    our_menu:       { en: 'Our Menu', hi: 'हमारा मेनू', mr: 'आमचा मेनू' },
    veg_thalis:     { en: 'Veg Thalis', hi: 'शाकाहारी थाली', mr: 'शाकाहारी थाळी' },

    // ══════════ ORDER FLOW ══════════
    step_quantity:  { en: 'Quantity', hi: 'मात्रा', mr: 'संख्या' },
    step_location:  { en: 'Location', hi: 'लोकेशन', mr: 'लोकेशन' },
    step_confirm:   { en: 'Confirm', hi: 'कन्फर्म', mr: 'कन्फर्म' },
    our_menu_cart:  { en: 'Our Menu — Add to Cart', hi: 'हमारा मेनू — कार्ट में डालें', mr: 'आमचा मेनू — कार्टमध्ये टाका' },
    delivery_details:{ en: 'Delivery Details', hi: 'डिलीवरी विवरण', mr: 'डिलिव्हरी तपशील' },
    detect_location:{ en: 'Detect My Location', hi: 'मेरा लोकेशन पता करें', mr: 'माझं लोकेशन शोधा' },
    location_detected:{ en: 'Location Detected', hi: 'लोकेशन मिल गया', mr: 'लोकेशन सापडलं' },
    review_confirm: { en: '✅ Review & Confirm', hi: '✅ समीक्षा और कन्फर्म', mr: '✅ पुनरावलोकन आणि कन्फर्म' },
    review_order:   { en: 'Review Order', hi: 'ऑर्डर समीक्षा', mr: 'ऑर्डर पुनरावलोकन' },
    delivering_to:  { en: 'Delivering to', hi: 'डिलीवरी पता', mr: 'डिलिव्हरी पत्ता' },
    pincode:        { en: 'Pincode', hi: 'पिनकोड', mr: 'पिनकोड' },
    delivery_time_label:{ en: 'Delivery Time', hi: 'डिलीवरी समय', mr: 'डिलिव्हरी वेळ' },
    landmark_label: { en: 'Landmark', hi: 'लैंडमार्क', mr: 'लँडमार्क' },
    helps_delivery: { en: '(helps delivery)', hi: '(डिलीवरी में मदद)', mr: '(डिलिव्हरीत मदत)' },
    first_order_off:{ en: 'First Order — 10% OFF Applied!', hi: 'पहला ऑर्डर — 10% छूट लागू!', mr: 'पहिला ऑर्डर — 10% सूट लागू!' },
    discount_auto:  { en: 'Discount auto-applied to your total', hi: 'छूट आपके टोटल पर अपने आप लागू', mr: 'सूट तुमच्या एकूणवर आपोआप लागू' },
    first_order_disc:{ en: '10% First Order Discount', hi: '10% पहला ऑर्डर छूट', mr: '10% पहिला ऑर्डर सूट' },
    safe_secure:    { en: 'We only use your name & profile photo', hi: 'हम सिर्फ आपका नाम और फोटो इस्तेमाल करते हैं', mr: 'आम्ही फक्त तुमचं नाव आणि फोटो वापरतो' },

    // ══════════ PAY PAGE ══════════
    processing_payment: { en: 'Processing your payment…', hi: 'आपका भुगतान प्रोसेस हो रहा है…', mr: 'तुमचे पेमेंट प्रोसेस होत आहे…' },
    payment_failed:     { en: 'Payment failed', hi: 'भुगतान विफल', mr: 'पेमेंट अयशस्वी' },
    try_again:          { en: 'Try Again', hi: 'फिर कोशिश करें', mr: 'पुन्हा प्रयत्न करा' },
    payment_success:    { en: 'Payment Successful!', hi: 'भुगतान सफल!', mr: 'पेमेंट यशस्वी!' },

    // ══════════ COMMON ══════════
    loading:        { en: 'Loading…', hi: 'लोड हो रहा है…', mr: 'लोड होत आहे…' },
    error:          { en: 'Something went wrong', hi: 'कुछ गलत हो गया', mr: 'काहीतरी चूक झाली' },
    retry:          { en: 'Retry', hi: 'पुन्हा प्रयत्न', mr: 'पुन्हा प्रयत्न करा' },
    cancel:         { en: 'Cancel', hi: 'रद्द करें', mr: 'रद्द करा' },
    ok:             { en: 'OK', hi: 'ठीक है', mr: 'ठीक आहे' },
    close:          { en: 'Close', hi: 'बंद करें', mr: 'बंद करा' },
    add_to_home:    { en: 'Add to Home Screen', hi: 'होम स्क्रीन पर जोड़ें', mr: 'होम स्क्रीनवर जोडा' },
    paid_online:    { en: 'Paid Online', hi: 'ऑनलाइन पेमेंट', mr: 'ऑनलाइन पेमेंट' },
    cod:            { en: 'COD', hi: 'कैश ऑन डिलीवरी', mr: 'कॅश ऑन डिलिव्हरी' },
    veg:            { en: 'Veg', hi: 'शाकाहारी', mr: 'शाकाहारी' },
    nonveg:         { en: 'Non-Veg', hi: 'मांसाहारी', mr: 'मांसाहारी' },

    // ══════════ LANGUAGE SELECTOR ══════════
    // ══════════ REDESIGN (home, cart bar, headers) ══════════
    hero_badge:      { en: 'Bestseller', hi: 'बेस्टसेलर', mr: 'बेस्टसेलर' },
    now_serving:     { en: 'Now serving', hi: 'अभी परोस रहे हैं', mr: 'आत्ता तयार' },
    hero_line1:      { en: 'Dal Bati Churma', hi: 'दाल बाटी चूरमा', mr: 'दाल बाटी चूरमा' },
    hero_line2:      { en: 'at just ₹80', hi: 'सिर्फ ₹80 में', mr: 'फक्त ₹80 मध्ये' },
    free_delivery:   { en: 'Free delivery', hi: 'फ्री डिलीवरी', mr: 'मोफत डिलिव्हरी' },
    hours_short:     { en: '10 AM – 10 PM', hi: 'सुबह 10 – रात 10', mr: 'सकाळी 10 – रात्री 10' },
    ratings_2k:      { en: '2.3k ratings', hi: '2.3k रेटिंग', mr: '2.3k रेटिंग्स' },
    wood_fire_baked: { en: 'Wood-fire baked', hi: 'लकड़ी की आँच पर', mr: 'चुलीवर भाजलेले' },
    search_for:      { en: 'Search for', hi: 'खोजें', mr: 'शोधा' },
    whats_on_mind:   { en: "What's on your mind?", hi: 'आज क्या खाना है?', mr: 'आज काय खायचं?' },
    cat_dalbatti:    { en: 'Dal Batti', hi: 'दाल बाटी', mr: 'दाल बाटी' },
    cat_bhakar:      { en: 'Bhakar', hi: 'भाकर', mr: 'भाकरी' },
    cat_nonveg:      { en: 'Non-Veg', hi: 'नॉन-वेज', mr: 'नॉन-व्हेज' },
    cat_chinese:     { en: 'Chinese', hi: 'चाइनीज़', mr: 'चायनीज' },
    cat_noodles:     { en: 'Noodles', hi: 'नूडल्स', mr: 'नूडल्स' },
    cat_rice:        { en: 'Fried Rice', hi: 'फ्राइड राइस', mr: 'फ्राईड राईस' },
    cat_paneer:      { en: 'Paneer', hi: 'पनीर', mr: 'पनीर' },
    cat_rolls:       { en: 'Rolls', hi: 'रोल्स', mr: 'रोल्स' },
    tab_thalis:      { en: 'Thalis', hi: 'थाली', mr: 'थाळी' },
    tab_starters:    { en: 'Starters', hi: 'स्टार्टर्स', mr: 'स्टार्टर्स' },
    tab_rice:        { en: 'Rice', hi: 'राइस', mr: 'राईस' },
    tab_mixrolls:    { en: 'Mix Rolls', hi: 'मिक्स रोल्स', mr: 'मिक्स रोल्स' },
    dishes:          { en: 'dishes', hi: 'डिश', mr: 'पदार्थ' },
    dish_one:        { en: 'dish', hi: 'डिश', mr: 'पदार्थ' },
    no_match:        { en: 'No dishes match', hi: 'कोई डिश नहीं मिली', mr: 'एकही पदार्थ सापडला नाही' },
    no_match_hint:   { en: 'Try another name, or turn off Veg only.', hi: 'दूसरा नाम आज़माएँ या "सिर्फ वेज" बंद करें।', mr: 'दुसरं नाव वापरून पहा किंवा "फक्त व्हेज" बंद करा.' },
    veg_only_on:     { en: 'Showing veg dishes only', hi: 'सिर्फ वेज डिश दिख रही हैं', mr: 'फक्त व्हेज पदार्थ दाखवत आहोत' },
    veg_only_off:    { en: 'Showing all dishes', hi: 'सभी डिश दिख रही हैं', mr: 'सर्व पदार्थ दाखवत आहोत' },
    why_love:        { en: 'Why people love us', hi: 'लोग हमें क्यों पसंद करते हैं', mr: 'लोकांना आम्ही का आवडतो' },
    greet_morning:   { en: 'Good morning', hi: 'सुप्रभात', mr: 'सुप्रभात' },
    greet_afternoon: { en: 'Good afternoon', hi: 'नमस्ते', mr: 'नमस्कार' },
    greet_evening:   { en: 'Good evening', hi: 'शुभ संध्या', mr: 'शुभ संध्याकाळ' },
    greet_q:         { en: 'What would you like to eat today?', hi: 'आज क्या खाना पसंद करेंगे?', mr: 'आज काय खायला आवडेल?' },
    cart_item:       { en: 'item', hi: 'आइटम', mr: 'आयटम' },
    cart_items:      { en: 'items', hi: 'आइटम', mr: 'आयटम' },
    view_cart:       { en: 'View cart', hi: 'कार्ट देखें', mr: 'कार्ट पहा' },
    chinese_opens:   { en: 'Shriyan Chinese opens at 3 PM', hi: 'श्रियन चाइनीज़ दोपहर 3 बजे खुलता है', mr: 'श्रियन चायनीज दुपारी 3 वाजता सुरू होते' },
    rolls_opens:     { en: 'Mauli Veg Rol opens at 5 PM', hi: 'माऊली वेज रोल शाम 5 बजे खुलता है', mr: 'माऊली व्हेज रोल संध्याकाळी 5 वाजता सुरू होते' },
    bill_details:    { en: 'Bill details', hi: 'बिल विवरण', mr: 'बिल तपशील' },
    live_status_history: { en: 'Live status & history', hi: 'लाइव स्टेटस और इतिहास', mr: 'लाइव्ह स्टेटस आणि इतिहास' },
    account_orders:  { en: 'Account & orders', hi: 'अकाउंट और ऑर्डर', mr: 'अकाउंट आणि ऑर्डर' },
    listening:       { en: 'Listening… say a dish name', hi: 'सुन रहे हैं… डिश का नाम बोलें', mr: 'ऐकत आहोत… पदार्थाचं नाव सांगा' },
    gold_title:      { en: 'FREE delivery on every order', hi: 'हर ऑर्डर पर फ्री डिलीवरी', mr: 'प्रत्येक ऑर्डरवर मोफत डिलिव्हरी' },
    gold_sub:        { en: 'Hot & fresh at your door in about 30 min', hi: 'लगभग 30 मिनट में गरमा-गरम आपके दरवाज़े पर', mr: 'साधारण 30 मिनिटांत गरमागरम तुमच्या दारात' },
    cat_all:         { en: 'All', hi: 'सभी', mr: 'सर्व' },
    sort:            { en: 'Sort', hi: 'क्रम', mr: 'क्रम' },
    sort_by:         { en: 'Sort by', hi: 'इस क्रम में दिखाएँ', mr: 'या क्रमाने दाखवा' },
    sort_relevance:  { en: 'Relevance', hi: 'सुझाया गया', mr: 'सुचवलेले' },
    sort_price_low:  { en: 'Price: low to high', hi: 'कीमत: कम से ज़्यादा', mr: 'किंमत: कमी ते जास्त' },
    sort_price_high: { en: 'Price: high to low', hi: 'कीमत: ज़्यादा से कम', mr: 'किंमत: जास्त ते कमी' },
    sort_discount:   { en: 'Biggest discount', hi: 'सबसे बड़ी छूट', mr: 'सर्वात मोठी सूट' },
    apply:           { en: 'Apply', hi: 'लागू करें', mr: 'लागू करा' },
    under_120:       { en: 'Under ₹120', hi: '₹120 से कम', mr: '₹120 पेक्षा कमी' },
    off_40:          { en: '40%+ OFF', hi: '40%+ छूट', mr: '40%+ सूट' },
    rec_for_you:     { en: 'Recommended for you', hi: 'आपके लिए खास', mr: 'तुमच्यासाठी खास' },
    rate_title:      { en: 'How was your food?', hi: 'खाना कैसा लगा?', mr: 'जेवण कसं वाटलं?' },
    rate_thanks:     { en: 'Thanks for rating!', hi: 'रेटिंग के लिए धन्यवाद!', mr: 'रेटिंगबद्दल धन्यवाद!' },
    rate_tell_more:  { en: 'Send it to us on WhatsApp →', hi: 'WhatsApp पर हमें भेजें →', mr: 'WhatsApp वर आम्हाला पाठवा →' },

    promo_k1:        { en: 'Delicious traditional meals', hi: 'स्वादिष्ट पारंपरिक खाना', mr: 'स्वादिष्ट पारंपरिक जेवण' },
    promo_k2:        { en: 'Double batti special', hi: 'डबल बाटी स्पेशल', mr: 'डबल बाटी स्पेशल' },
    promo_k3:        { en: 'Maharashtrian classic', hi: 'महाराष्ट्रीयन क्लासिक', mr: 'अस्सल महाराष्ट्रीयन' },
    promo_k4:        { en: 'Indo-Chinese favourite', hi: 'इंडो-चाइनीज़ पसंदीदा', mr: 'इंडो-चायनीज आवडतं' },
    promo_k5:        { en: 'Spicy & saucy', hi: 'तीखा और चटपटा', mr: 'तिखट आणि चटपटीत' },
    promo_k6:        { en: 'Evening rolls · 5–10 PM', hi: 'शाम के रोल · 5–10 PM', mr: 'संध्याकाळचे रोल · 5–10 PM' },
    promo_k7:        { en: 'Non-veg thali', hi: 'नॉन-वेज थाली', mr: 'नॉन-व्हेज थाळी' },
    greet_night:     { en: 'Up late', hi: 'नमस्ते', mr: 'नमस्कार' },
    hero_q_open:     { en: 'Craving {dish}?', hi: '{dish} खाने का मन है?', mr: '{dish} खायचं मन आहे?' },
    hero_q_closed:   { en: 'Dreaming of {dish}?', hi: 'सपनों में {dish}?', mr: 'स्वप्नात {dish}?' },
    hero_sub_open:   { en: 'Hot from 3 kitchens, at your door in about 30 min.', hi: '3 किचन से गरमा-गरम, लगभग 30 मिनट में आपके दरवाज़े पर।', mr: '3 किचनमधून गरमागरम, साधारण 30 मिनिटांत तुमच्या दारात.' },
    hero_sub_closed: { en: "We open at 10 AM — plan tomorrow's feast.", hi: 'हम सुबह 10 बजे खुलते हैं — कल की दावत अभी चुन लीजिए।', mr: 'आम्ही सकाळी 10 वाजता सुरू होतो — उद्याची मेजवानी आत्ताच ठरवा.' },
    help_support:    { en: 'Help & support', hi: 'मदद और सहायता', mr: 'मदत आणि सहाय्य' },
    search_dishes:   { en: 'Search dishes', hi: 'डिश खोजें', mr: 'पदार्थ शोधा' },
    opens_10:        { en: 'Opens 10 AM', hi: 'सुबह 10 बजे', mr: 'सकाळी 10 वाजता' },
    opens_3:         { en: 'Opens 3 PM', hi: 'दोपहर 3 बजे', mr: 'दुपारी 3 वाजता' },
    opens_5:         { en: 'Opens 5 PM', hi: 'शाम 5 बजे', mr: 'संध्या. 5 वाजता' },
    paused_short:    { en: 'Paused', hi: 'रुका है', mr: 'थांबले' },
    your_order:      { en: 'Your order', hi: 'आपका ऑर्डर', mr: 'तुमची ऑर्डर' },
    obs_empty:       { en: 'Add dishes from the menu to see them here.', hi: 'मेनू से डिश जोड़ें, वो यहाँ दिखेंगी।', mr: 'मेनूमधून पदार्थ जोडा, ते इथे दिसतील.' },
    chef_sign_thanks:{ en: 'THANK YOU', hi: 'धन्यवाद', mr: 'धन्यवाद' },
    eta_any:         { en: 'Any minute now', hi: 'बस पहुँचने वाला है', mr: 'कधीही पोहोचेल' },
    opens_in:        { en: 'Opens in', hi: 'खुलेगा', mr: 'सुरू होईल' },
    perk_track:      { en: 'Live tracking', hi: 'लाइव ट्रैकिंग', mr: 'लाइव्ह ट्रॅकिंग' },
    perk_track_sub:  { en: 'Watch your food on its way', hi: 'अपना खाना आते हुए देखें', mr: 'तुमचं जेवण येताना पाहा' },
    perk_reorder:    { en: 'One-tap reorder', hi: 'एक टैप में दोबारा ऑर्डर', mr: 'एका टॅपमध्ये पुन्हा ऑर्डर' },
    perk_reorder_sub:{ en: 'Your favourites, again', hi: 'आपकी पसंद, फिर से', mr: 'तुमच्या आवडीचं, पुन्हा' },
    perk_fast:       { en: 'Faster checkout', hi: 'तेज़ चेकआउट', mr: 'जलद चेकआउट' },
    perk_fast_sub:   { en: 'Name & number saved', hi: 'नाम और नंबर सेव रहते हैं', mr: 'नाव आणि नंबर सेव्ह राहतात' },
    perk_offers:     { en: 'Offers first', hi: 'ऑफ़र सबसे पहले', mr: 'ऑफर सर्वात आधी' },
    perk_offers_sub: { en: 'Deals before everyone', hi: 'सबसे पहले डील्स', mr: 'सर्वात आधी डील्स' },
    chat_whatsapp:   { en: 'Chat with us on WhatsApp', hi: 'WhatsApp पर हमसे बात करें', mr: 'WhatsApp वर आमच्याशी बोला' },
    need_help:       { en: 'Need help with an order?', hi: 'ऑर्डर में मदद चाहिए?', mr: 'ऑर्डरसाठी मदत हवी आहे?' },
    call_us:         { en: 'Call us', hi: 'हमें कॉल करें', mr: 'आम्हाला कॉल करा' },
    chef_open_title: { en: 'Welcome to Aapla Swad!', hi: 'आपला स्वाद में आपका स्वागत है!', mr: 'आपला स्वादमध्ये तुमचं स्वागत आहे!' },
    chef_welcome_back: { en: 'Welcome back', hi: 'फिर से स्वागत है', mr: 'पुन्हा स्वागत आहे' },
    chef_open_sub:   { en: 'The kitchen is open — hot food at your door in about 30 minutes.', hi: 'किचन खुला है — लगभग 30 मिनट में गरमा-गरम खाना आपके दरवाज़े पर।', mr: 'किचन सुरू आहे — साधारण 30 मिनिटांत गरमागरम जेवण तुमच्या दारात.' },
    chef_menu_cta:   { en: 'See the menu', hi: 'मेनू देखें', mr: 'मेनू पहा' },
    chef_night_title:{ en: "We're closed for the night", hi: 'आज रात के लिए किचन बंद है', mr: 'आज रात्रीसाठी किचन बंद आहे' },
    chef_night_sub:  { en: 'The kitchen opens again at 10 AM. Sweet dreams!', hi: 'किचन सुबह 10 बजे फिर खुलेगा। शुभ रात्रि!', mr: 'किचन सकाळी 10 वाजता पुन्हा सुरू होईल. शुभ रात्री!' },
    chef_early_title:{ en: 'Almost time!', hi: 'बस थोड़ी देर और!', mr: 'थोडाच वेळ!' },
    chef_early_sub:  { en: 'The kitchen opens at 10 AM. Have a look at the menu meanwhile.', hi: 'किचन सुबह 10 बजे खुलेगा। तब तक मेनू देख लीजिए।', mr: 'किचन सकाळी 10 वाजता सुरू होईल. तोपर्यंत मेनू पाहून घ्या.' },
    chef_paused_title:{ en: 'Orders are paused', hi: 'ऑर्डर अभी रुके हुए हैं', mr: 'ऑर्डर सध्या थांबले आहेत' },
    chef_paused_sub: { en: "We'll be back in a little while.", hi: 'थोड़ी देर में वापस आते हैं।', mr: 'थोड्या वेळात परत येतो.' },
    chef_sign_open:  { en: 'OPEN', hi: 'खुला है', mr: 'सुरू आहे' },
    chef_sign_closed:{ en: 'CLOSED', hi: 'बंद', mr: 'बंद' },
    chef_sign_paused:{ en: 'BRB', hi: 'रुकिए', mr: 'थांबा' },
    close_btn:       { en: 'Close', hi: 'बंद करें', mr: 'बंद करा' },
    choose_language: { en: 'Choose language', hi: 'भाषा चुनें', mr: 'भाषा निवडा' },
    lang_changed:    { en: 'Language changed', hi: 'भाषा बदल गई', mr: 'भाषा बदलली' },
    preferences:     { en: 'Preferences', hi: 'पसंद', mr: 'प्राधान्ये' },
    language:        { en: 'Language', hi: 'भाषा', mr: 'भाषा' },

    lang_en:    { en: 'English', hi: 'English', mr: 'English' },
    lang_hi:    { en: 'हिंदी', hi: 'हिंदी', mr: 'हिंदी' },
    lang_mr:    { en: 'मराठी', hi: 'मराठी', mr: 'मराठी' },
    select_lang:{ en: 'Language', hi: 'भाषा', mr: 'भाषा' },
};

// ══════════ CORE ENGINE ══════════

/** Current language code */
let _lang = localStorage.getItem('sp_lang') || 'en';

/** Get translation for a key */
function t(key, fallback) {
    const entry = TRANSLATIONS[key];
    if (!entry) return fallback || key;
    return entry[_lang] || entry.en || fallback || key;
}

/** Get current language code */
function getLang() { return _lang; }

/** The three languages, each shown in its own script */
const LANGS = [
    { code: 'en', short: 'EN', native: 'English', english: 'English', glyph: 'A' },
    { code: 'hi', short: 'हिं', native: 'हिंदी', english: 'Hindi', glyph: 'अ' },
    { code: 'mr', short: 'मरा', native: 'मराठी', english: 'Marathi', glyph: 'म' }
];

function langIcon(name) {
    return typeof window.ASIcon === 'function' ? window.ASIcon(name) : '';
}

/** Set language and re-apply all translations */
function setLang(code) {
    if (!['en', 'hi', 'mr'].includes(code)) return;
    const changed = code !== _lang;
    _lang = code;
    localStorage.setItem('sp_lang', code);
    applyLanguage();
    // Parts of the page built in JS (the home headline) listen for this
    document.dispatchEvent(new CustomEvent('as:lang', { detail: code }));
    const info = LANGS.find(l => l.code === code);
    // Header pill
    const label = document.querySelector('#langBtn .lang-btn-label');
    if (label && info) label.textContent = info.short;
    // Every picker on the page (header menu, profile preferences)
    document.querySelectorAll('.lang-option, [data-lang-choice]').forEach(el => {
        const on = (el.dataset.lang || el.dataset.langChoice) === code;
        el.classList.toggle('active', on);
        if (el.getAttribute('role') === 'radio') el.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    if (changed && document.body) {
        document.body.classList.remove('lang-swap');
        void document.body.offsetWidth;
        document.body.classList.add('lang-swap');
        setTimeout(() => document.body.classList.remove('lang-swap'), 500);
        if (window.ASTheme && ASTheme.toast && info) ASTheme.toast(t('lang_changed', 'Language changed') + ' · ' + info.native, 'globe');
    }
}

/** Apply translations to all elements with data-i18n attribute */
function applyLanguage() {
    document.documentElement.lang = _lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val !== key) {
            // Check if it's a placeholder
            if (el.hasAttribute('data-i18n-attr')) {
                el.setAttribute(el.getAttribute('data-i18n-attr'), val);
            } else {
                el.textContent = val;
            }
        }
    });
}

/** Language picker in the home header: a pill that opens a popover (a sheet on phones) */
function injectLangSelector() {
    // Only on the homepage; the profile page has its own preferences card
    const page = window.location.pathname;
    if (page !== '/' && page !== '/index.html' && !page.endsWith('/index.html')) return;

    const navbar = document.querySelector('.navbar') || document.querySelector('.order-nav-inner') || document.querySelector('nav');
    if (!navbar || document.getElementById('langSelector')) return;

    const current = LANGS.find(l => l.code === _lang) || LANGS[0];
    const wrapper = document.createElement('div');
    wrapper.id = 'langSelector';
    wrapper.style.cssText = 'position:relative;flex-shrink:0;';
    wrapper.innerHTML =
        '<button type="button" id="langBtn" class="lang-btn" aria-haspopup="dialog" aria-expanded="false" aria-controls="langDropdown" aria-label="' + t('select_lang', 'Language') + '">' +
            langIcon('globe') + '<span class="lang-btn-label">' + current.short + '</span>' + langIcon('chevron') +
        '</button>';

    // The menu lives on <body>: the sticky header's backdrop blur would trap a fixed sheet
    const scrim = document.createElement('div');
    scrim.className = 'lang-scrim';
    const menu = document.createElement('div');
    menu.id = 'langDropdown';
    menu.className = 'lang-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-labelledby', 'langTitle');
    menu.innerHTML =
        '<div class="lang-handle"></div>' +
        '<div class="lang-head"><b id="langTitle" data-i18n="choose_language">' + t('choose_language', 'Choose language') + '</b>' +
            '<span>English · हिंदी · मराठी</span></div>' +
        LANGS.map(l =>
            '<button type="button" class="lang-option' + (l.code === _lang ? ' active' : '') + '" data-lang="' + l.code + '" lang="' + l.code + '">' +
                '<span class="lang-glyph">' + l.glyph + '</span>' +
                '<span class="lang-names"><b>' + l.native + '</b><small>' + l.english + '</small></span>' +
                '<span class="lang-check">' + langIcon('check') + '</span>' +
            '</button>'
        ).join('');

    const navActions = navbar.querySelector('.nav-actions');
    if (navActions) navbar.insertBefore(wrapper, navActions);
    else navbar.appendChild(wrapper);
    document.body.appendChild(scrim);
    document.body.appendChild(menu);

    const btn = document.getElementById('langBtn');
    const isOpen = () => menu.classList.contains('open');
    function place() {
        if (window.innerWidth < 600) return;          // phones: CSS turns it into a bottom sheet
        const r = btn.getBoundingClientRect();
        menu.style.top = (r.bottom + 8) + 'px';
        menu.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
        menu.style.left = 'auto';
    }
    function open() {
        place();
        menu.classList.add('open');
        scrim.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        const active = menu.querySelector('.lang-option.active') || menu.querySelector('.lang-option');
        if (active) active.focus({ preventScroll: true });
    }
    function close() {
        menu.classList.remove('open');
        scrim.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus({ preventScroll: true });
    }
    btn.addEventListener('click', e => { e.stopPropagation(); isOpen() ? close() : open(); });
    scrim.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) close(); });
    window.addEventListener('resize', () => { if (isOpen()) place(); });
    window.addEventListener('scroll', () => { if (isOpen()) place(); }, { passive: true });
    menu.querySelectorAll('.lang-option').forEach(opt => {
        opt.addEventListener('click', () => {
            setLang(opt.dataset.lang);
            setTimeout(close, 220);                    // let the tick land before closing
        });
    });
}

// ══════════ AUTO-INIT ══════════
// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        injectLangSelector();
        applyLanguage();
    });
} else {
    injectLangSelector();
    applyLanguage();
}
