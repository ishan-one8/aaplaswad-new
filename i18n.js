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
    open_status:        { en: '🟢 Open',  hi: '🟢 खुला है',  mr: '🟢 सुरू आहे' },
    closed_status:      { en: '🔴 Closed', hi: '🔴 बंद है',   mr: '🔴 बंद आहे' },
    closed_msg:         { en: "🕐 We're closed right now", hi: '🕐 अभी बंद है',  mr: '🕐 सध्या बंद आहे' },
    open_hours:         { en: 'Open daily 10:00 AM – 10:00 PM', hi: 'रोज़ सुबह 10 – रात 10 बजे तक', mr: 'रोज सकाळी 10 – रात्री 10 वाजेपर्यंत' },
    orders_today:       { en: 'orders today', hi: 'आज के ऑर्डर', mr: 'आजचे ऑर्डर' },
    delivery_time:      { en: '⏱ ~25-35 min delivery', hi: '⏱ ~25-35 मिनट डिलीवरी', mr: '⏱ ~25-35 मिनिटे डिलिव्हरी' },
    customer_love:      { en: '⭐ Customer Love', hi: '⭐ ग्राहकों की पसंद', mr: '⭐ ग्राहकांची पसंती' },
    pure_veg_badge:     { en: '🟢 Pure Veg', hi: '🟢 शुद्ध शाकाहारी', mr: '🟢 शुद्ध शाकाहारी' },
    delivery_30min:     { en: '🛵 30 min delivery', hi: '🛵 30 मिनट डिलीवरी', mr: '🛵 30 मिनिटे डिलिव्हरी' },
    first_order_promo:  { en: '🎉 First Order? Get 10% OFF!', hi: '🎉 पहला ऑर्डर? 10% छूट पाएं!', mr: '🎉 पहिला ऑर्डर? 10% सूट मिळवा!' },
    promo_sub:          { en: 'Auto-applied at checkout • No code needed', hi: 'चेकआउट पर अपने आप लागू • कोड नहीं चाहिए', mr: 'चेकआउटला आपोआप लागू • कोड नको' },
    nonveg_thalis:      { en: 'Non-Veg Thalis', hi: 'मांसाहारी थाली', mr: 'मांसाहारी थाळी' },
    copy:               { en: 'Copy', hi: 'कॉपी', mr: 'कॉपी' },
    refer_earn:         { en: '🎯 Refer & Earn ₹20', hi: '🎯 रेफर करें और ₹20 कमाएं', mr: '🎯 रेफर करा आणि ₹20 कमवा' },
    download_app:       { en: 'Download App', hi: 'ऐप डाउनलोड करें', mr: 'अॅप डाउनलोड करा' },
    share:              { en: 'Share', hi: 'शेयर करें', mr: 'शेअर करा' },
    refer_earn:         { en: '🎯 Refer & Earn ₹20', hi: '🎯 रेफर करें और ₹20 कमाएं', mr: '🎯 रेफर करा आणि ₹20 कमवा' },
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
    first_order_free:   { en: '🎉 First Order Free Delivery!', hi: '🎉 पहले ऑर्डर पर फ्री डिलीवरी!', mr: '🎉 पहिल्या ऑर्डरवर मोफत डिलिव्हरी!' },
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
    detect_loc:     { en: '📍 Detect Location', hi: '📍 लोकेशन पता करें', mr: '📍 लोकेशन शोधा' },
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
    'desc_zunka-bhakar':        { en: '3 bhakri • zunka • onion • chili • pickle', hi: '3 भाकरी • झुणका • प्याज • मिर्ची • अचार', mr: '3 भाकरी • झुणका • कांदा • मिरची • लोणचं' },
    'desc_bharit-bhakar':       { en: 'bharit • 2 bhakar • onion • lemon • aachar • thecha', hi: 'भरीत • 2 भाकर • प्याज • नींबू • अचार • ठेचा', mr: 'भरीत • 2 भाकर • कांदा • लिंबू • लोणचं • ठेचा' },
    'desc_special-dal-batti':   { en: '8 pcs batti • dal • sweet • onion • lemon', hi: '8 बट्टी • दाल • मिठाई • प्याज • नींबू', mr: '8 बट्टी • दाल • गोड • कांदा • लिंबू' },
    'desc_bombil-thali':        { en: '6 pcs bombil • rassa • rice • 2 bhakar • onion • lemon', hi: '6 बोंबिल • रस्सा • चावल • 2 भाकर • प्याज • नींबू', mr: '6 बोंबील • रस्सा • भात • 2 भाकर • कांदा • लिंबू' },
    'desc_zinga-thali':         { en: 'zinga chatni • 2 bhakar • onion • lemon', hi: 'झिंगा चटनी • 2 भाकर • प्याज • नींबू', mr: 'झिंगा चटणी • 2 भाकर • कांदा • लिंबू' },
    'desc_chicken-thali':       { en: '4 pcs chicken • rassa • rice • 2 bhakari • onion • lemon', hi: '4 चिकन • रस्सा • चावल • 2 भाकरी • प्याज • नींबू', mr: '4 चिकन • रस्सा • भात • 2 भाकरी • कांदा • लिंबू' },

    // ══════════ EXTRAS ══════════
    'extra_ghee':       { en: '🧈 Extra Ghee', hi: '🧈 एक्स्ट्रा घी', mr: '🧈 एक्स्ट्रा तूप' },
    'extra_churma':     { en: '🍮 Extra Churma', hi: '🍮 एक्स्ट्रा चूरमा', mr: '🍮 एक्स्ट्रा चूरमा' },
    'extra_bati':       { en: '🫓 2 Extra Bati', hi: '🫓 2 एक्स्ट्रा बाटी', mr: '🫓 2 एक्स्ट्रा बाटी' },
    'extra_onion':      { en: '🧅 Extra Onion Salad', hi: '🧅 एक्स्ट्रा प्याज सलाद', mr: '🧅 एक्स्ट्रा कांदा सॅलड' },
    'extra_bhakri':     { en: '🫓 2 Extra Bhakri', hi: '🫓 2 एक्स्ट्रा भाकरी', mr: '🫓 2 एक्स्ट्रा भाकरी' },
    'extra_bhakar':     { en: '🫓 2 Extra Bhakar', hi: '🫓 2 एक्स्ट्रा भाकर', mr: '🫓 2 एक्स्ट्रा भाकर' },
    'extra_thecha':     { en: '🌶️ Extra Thecha', hi: '🌶️ एक्स्ट्रा ठेचा', mr: '🌶️ एक्स्ट्रा ठेचा' },
    'extra_rice':       { en: '🍚 Extra Rice', hi: '🍚 एक्स्ट्रा चावल', mr: '🍚 एक्स्ट्रा भात' },
    'extra_bombil':     { en: '🐟 Extra Bombil (3 pcs)', hi: '🐟 एक्स्ट्रा बोंबिल (3 पीस)', mr: '🐟 एक्स्ट्रा बोंबील (3 नग)' },
    'extra_zinga':      { en: '🦐 Extra Zinga', hi: '🦐 एक्स्ट्रा झिंगा', mr: '🦐 एक्स्ट्रा झिंगा' },
    'extra_bhakari':    { en: '🫓 2 Extra Bhakari', hi: '🫓 2 एक्स्ट्रा भाकरी', mr: '🫓 2 एक्स्ट्रा भाकरी' },
    'extra_chicken':    { en: '🍗 Extra Chicken (2 pcs)', hi: '🍗 एक्स्ट्रा चिकन (2 पीस)', mr: '🍗 एक्स्ट्रा चिकन (2 नग)' },
    'extra_batti':      { en: '🫓 4 Extra Batti', hi: '🫓 4 एक्स्ट्रा बट्टी', mr: '🫓 4 एक्स्ट्रा बट्टी' },
    'extra_sweet':      { en: '🍮 Extra Sweet', hi: '🍮 एक्स्ट्रा मिठाई', mr: '🍮 एक्स्ट्रा गोड' },

    // ══════════ CART / ORDER UI ══════════
    add_btn:        { en: 'ADD', hi: 'डालें', mr: 'टाका' },
    sold_out:       { en: 'SOLD OUT', hi: 'बिक गया', mr: 'संपलं' },
    add_extras_colon:{ en: 'Add extras:', hi: 'एक्स्ट्रा जोड़ें:', mr: 'एक्स्ट्रा जोडा:' },
    your_cart:      { en: 'YOUR CART', hi: 'आपकी कार्ट', mr: 'तुमची कार्ट' },
    items_ready:    { en: 'items ready to order', hi: 'ऑर्डर के लिए तैयार', mr: 'ऑर्डरसाठी तयार' },
    add_more:       { en: '➕ Want to add more items?', hi: '➕ और आइटम जोड़ना है?', mr: '➕ आणखी आयटम जोडायचे?' },
    veg_label:      { en: '● VEG', hi: '● शाकाहारी', mr: '● शाकाहारी' },
    nonveg_label:   { en: '● NON-VEG', hi: '● मांसाहारी', mr: '● मांसाहारी' },
    // ══════════ ORDER SUCCESS ══════════
    order_placed:       { en: '🎉 Order Placed!', hi: '🎉 ऑर्डर हो गया!', mr: '🎉 ऑर्डर झाला!' },
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
    verified_google:{ en: '✅ Verified with Google', hi: '✅ Google से वेरिफाइड', mr: '✅ Google ने व्हेरिफाइड' },
    orders_stat:    { en: 'Orders', hi: 'ऑर्डर', mr: 'ऑर्डर' },
    total_spent:    { en: 'Total Spent', hi: 'कुल खर्च', mr: 'एकूण खर्च' },
    active_stat:    { en: 'Active', hi: 'सक्रिय', mr: 'सक्रिय' },
    dal_bati_churma:{ en: 'Dal Bati Churma', hi: 'दाल बाटी चूरमा', mr: 'दाल बाटी चूरमा' },
    live_status:    { en: 'Live status', hi: 'लाइव स्थिति', mr: 'लाइव्ह स्थिती' },
    loyalty_stamps: { en: '🏷️ Loyalty Stamps', hi: '🏷️ लॉयल्टी स्टैम्प', mr: '🏷️ लॉयल्टी स्टॅम्प' },
    collect_5:      { en: 'Collect 5 stamps for a FREE thali!', hi: '5 स्टैम्प इकट्ठा करें और मुफ्त थाली पाएं!', mr: '5 स्टॅम्प गोळा करा आणि मोफत थाळी मिळवा!' },
    share_friends:  { en: 'Share Aapla Swad with Friends', hi: 'Aapla Swad दोस्तों से शेयर करें', mr: 'Aapla Swad मित्रांसोबत शेअर करा' },
    my_orders:      { en: '📦 My Orders', hi: '📦 मेरे ऑर्डर', mr: '📦 माझे ऑर्डर' },
    loading_orders: { en: 'Loading your orders...', hi: 'आपके ऑर्डर लोड हो रहे हैं...', mr: 'तुमचे ऑर्डर लोड होत आहेत...' },
    sign_out_btn:   { en: '🚪 Sign Out', hi: '🚪 साइन आउट', mr: '🚪 साइन आउट' },
    sign_in:        { en: 'Sign in with Google', hi: 'Google से साइन इन करें', mr: 'Google ने साइन इन करा' },
    sign_out:       { en: 'Sign Out', hi: 'साइन आउट', mr: 'साइन आउट' },
    no_orders:      { en: 'No orders yet', hi: 'अभी तक कोई ऑर्डर नहीं', mr: 'अजून कोणताही ऑर्डर नाही' },
    order_history:  { en: 'Order History', hi: 'ऑर्डर इतिहास', mr: 'ऑर्डर इतिहास' },
    share_app_title:{ en: 'Share App', hi: 'ऐप शेयर करें', mr: 'अॅप शेअर करा' },
    referral_code:  { en: 'Referral Code', hi: 'रेफरल कोड', mr: 'रेफरल कोड' },
    ref_share_sub:  { en: 'Share your code • Both get ₹20 off', hi: 'कोड शेयर करें • दोनों को ₹20 छूट', mr: 'कोड शेअर करा • दोघांना ₹20 सूट' },

    // ══════════ TRACK PAGE ══════════
    my_orders_tab:      { en: '📦 My Orders', hi: '📦 मेरे ऑर्डर', mr: '📦 माझे ऑर्डर' },
    track_by_id:        { en: '🔍 Track by ID', hi: '🔍 ID से ट्रैक करें', mr: '🔍 ID ने ट्रॅक करा' },
    new_order:          { en: '+ New Order', hi: '+ नया ऑर्डर', mr: '+ नवीन ऑर्डर' },
    track_your_order:   { en: '📍 Track Your Order', hi: '📍 अपना ऑर्डर ट्रैक करें', mr: '📍 तुमचा ऑर्डर ट्रॅक करा' },
    enter_order_id:     { en: 'Enter your order ID to check status', hi: 'स्थिति जानने के लिए ऑर्डर ID डालें', mr: 'स्थिती जाणण्यासाठी ऑर्डर ID टाका' },
    track_btn:          { en: 'Track', hi: 'ट्रैक करें', mr: 'ट्रॅक करा' },
    order_not_found:    { en: 'Order not found. Check your ID.', hi: 'ऑर्डर नहीं मिला। ID चेक करें।', mr: 'ऑर्डर सापडला नाही. ID तपासा.' },
    arriving_in:        { en: 'ARRIVING IN', hi: 'पहुँचने में', mr: 'पोहोचण्यास' },
    call_delivery:      { en: '📞 Call the delivery partner', hi: '📞 डिलीवरी पार्टनर को कॉल करें', mr: '📞 डिलिव्हरी पार्टनरला कॉल करा' },
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
    add_extras:     { en: '🧈 Add Extras', hi: '🧈 एक्स्ट्रा जोड़ें', mr: '🧈 एक्स्ट्रा जोडा' },
    qty:            { en: 'Qty', hi: 'मात्रा', mr: 'संख्या' },
    includes:       { en: 'Includes', hi: 'शामिल है', mr: 'समाविष्ट आहे' },
    back:           { en: 'Back', hi: 'वापस', mr: 'मागे' },
    view_menu:      { en: 'View Full Menu', hi: 'पूरा मेनू देखें', mr: 'संपूर्ण मेनू पहा' },
    added:          { en: 'Added!', hi: 'जोड़ा गया!', mr: 'जोडलं!' },
    our_menu:       { en: '🍛 Our Menu', hi: '🍛 हमारा मेनू', mr: '🍛 आमचा मेनू' },
    veg_thalis:     { en: 'Veg Thalis', hi: 'शाकाहारी थाली', mr: 'शाकाहारी थाळी' },

    // ══════════ ORDER FLOW ══════════
    step_quantity:  { en: 'Quantity', hi: 'मात्रा', mr: 'संख्या' },
    step_location:  { en: 'Location', hi: 'लोकेशन', mr: 'लोकेशन' },
    step_confirm:   { en: 'Confirm', hi: 'कन्फर्म', mr: 'कन्फर्म' },
    our_menu_cart:  { en: '🍛 Our Menu — Add to Cart', hi: '🍛 हमारा मेनू — कार्ट में डालें', mr: '🍛 आमचा मेनू — कार्टमध्ये टाका' },
    delivery_details:{ en: '📍 Delivery Details', hi: '📍 डिलीवरी विवरण', mr: '📍 डिलिव्हरी तपशील' },
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
    safe_secure:    { en: '🔒 We only use your name & profile photo', hi: '🔒 हम सिर्फ आपका नाम और फोटो इस्तेमाल करते हैं', mr: '🔒 आम्ही फक्त तुमचं नाव आणि फोटो वापरतो' },

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

/** Set language and re-apply all translations */
function setLang(code) {
    if (!['en', 'hi', 'mr'].includes(code)) return;
    _lang = code;
    localStorage.setItem('sp_lang', code);
    applyLanguage();
    // Update the selector button text
    const btn = document.getElementById('langBtn');
    if (btn) {
        const flags = { en: '🇬🇧', hi: '🇮🇳', mr: '🇮🇳' };
        const labels = { en: 'EN', hi: 'हि', mr: 'मर' };
        btn.innerHTML = flags[code] + ' ' + labels[code];
    }
    // Update active state in dropdown
    document.querySelectorAll('.lang-option').forEach(el => {
        el.classList.toggle('active', el.dataset.lang === code);
    });
}

/** Apply translations to all elements with data-i18n attribute */
function applyLanguage() {
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

/** Inject the language selector into the navbar — only on homepage */
function injectLangSelector() {
    // Only show on homepage (index.html)
    const page = window.location.pathname;
    if (page !== '/' && page !== '/index.html' && !page.endsWith('/index.html')) return;

    // Find the navbar — try multiple selectors
    const navbar = document.querySelector('.navbar') || document.querySelector('.order-nav-inner') || document.querySelector('nav');
    if (!navbar) return;

    // Check if already injected
    if (document.getElementById('langSelector')) return;

    const flags = { en: '🇬🇧', hi: '🇮🇳', mr: '🇮🇳' };
    const labels = { en: 'EN', hi: 'हि', mr: 'मर' };

    const wrapper = document.createElement('div');
    wrapper.id = 'langSelector';
    wrapper.style.cssText = 'position:relative;z-index:99;flex-shrink:0;';
    wrapper.innerHTML = `
        <button id="langBtn" style="
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 8px;
            padding: 0.3rem 0.5rem;
            color: #f3f4f6;
            font-size: 0.7rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-family: inherit;
            transition: all 0.2s;
        ">${flags[_lang]} ${labels[_lang]}</button>
        <div id="langDropdown" style="
            display: none;
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 0.3rem;
            background: #1a1a1a;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            min-width: 130px;
            animation: fadeIn 0.15s ease;
        ">
            <div class="lang-option ${_lang === 'en' ? 'active' : ''}" data-lang="en" style="
                padding: 0.55rem 0.75rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.4rem;
                font-size: 0.78rem;
                color: #e5e7eb;
                transition: background 0.15s;
            ">🇬🇧 English</div>
            <div class="lang-option ${_lang === 'hi' ? 'active' : ''}" data-lang="hi" style="
                padding: 0.55rem 0.75rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.4rem;
                font-size: 0.78rem;
                color: #e5e7eb;
                border-top: 1px solid rgba(255,255,255,0.06);
                transition: background 0.15s;
            ">🇮🇳 हिंदी</div>
            <div class="lang-option ${_lang === 'mr' ? 'active' : ''}" data-lang="mr" style="
                padding: 0.55rem 0.75rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.4rem;
                font-size: 0.78rem;
                color: #e5e7eb;
                border-top: 1px solid rgba(255,255,255,0.06);
                transition: background 0.15s;
            ">🇮🇳 मराठी</div>
        </div>
    `;

    // Insert in the right position based on page structure
    const navActions = navbar.querySelector('.nav-actions');
    if (navActions) {
        // Index page — insert before nav-actions
        navbar.insertBefore(wrapper, navActions);
    } else {
        // Other pages — append at end
        navbar.appendChild(wrapper);
    }

    // Toggle dropdown
    const btn = document.getElementById('langBtn');
    const dropdown = document.getElementById('langDropdown');

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    // Language selection
    dropdown.querySelectorAll('.lang-option').forEach(opt => {
        opt.addEventListener('click', () => {
            setLang(opt.dataset.lang);
            dropdown.style.display = 'none';
        });
        // Hover effect
        opt.addEventListener('mouseenter', () => {
            opt.style.background = 'rgba(255,255,255,0.08)';
        });
        opt.addEventListener('mouseleave', () => {
            opt.style.background = 'transparent';
        });
    });

    // Close dropdown on outside click
    document.addEventListener('click', () => {
        dropdown.style.display = 'none';
    });

    // Style for active language
    const style = document.createElement('style');
    style.textContent = `
        .lang-option.active {
            background: rgba(234,88,12,0.15) !important;
            color: #f59e0b !important;
            font-weight: 700;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
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
