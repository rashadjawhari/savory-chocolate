// Shared English <-> Arabic dictionary, catalog localizer, and bilingual search normalizer.

export const isAr = () => document.documentElement.lang === 'ar';

/** Normalizes Latin + Arabic text for forgiving search matching (strips harakat/tatweel, unifies alef/ya/ta-marbouta). */
export function normalizeSearchText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

const CATALOG_AR = new Map([
  // Categories
  ['Cakes by the slice', 'كيك بالقطعة'],
  ['Crepes & Waffles', 'كريب ووافل'],
  ['Signature Gateaux & Bakes', 'جاتو ومخبوزات مميزة'],
  ['Bakes', 'مخبوزات'],
  ['Chocolates & Bark', 'شوكولاتة وألواح مكسرات'],
  ['Drinks', 'مشروبات'],
  ['Savory Flurry & Shakes', 'سافوري فلوري وميلك شيك'],
  ['Luxury Gift Boxes', 'علب الهدايا الفاخرة'],

  // Category descriptions
  ['Hand-finished whole tortes, molten lava bakes, and signature chocolate creations.', 'قوالب جاتو متكاملة، مخبوزات شوكولاتة ذائبة، وإبداعات سافوري الخاصة.'],
  ['Artisan bonbons, pistachio kunafa bars, and hand-broken roasted nut barks.', 'شوكولاتة يدوية محضّرة بعناية، ألواح فستق كنافة، ومكسرات مغلّفة بالشوكولاتة.'],
  ['Warm golden crepes and crispy waffles drenched in Belgian milk and dark couverture.', 'كريب دافئ ذهبي ووافل مقرمش مغطّى بأجود الشوكولاتة البلجيكية بالحليب والداكنة.'],
  ['Handcrafted velvety soft serve flurries and decadent thick shakes.', 'آيس كريم سافوري فلوري الكريمي وميلك شيك الشوكولاتة الغني.'],
  ['Decadent chocolate fudge slices, spiced carrot cakes, and patisserie slices.', 'قطع كيك فادج الشوكولاتة الغنية، كيك الجزر، وقطع الباتيسيري الطازجة.'],
  ['Freshly baked Belgian chocolate brownies, chewy cookies, and afternoon treats.', 'براوني الشوكولاتة البلجيكية، كوكيز محضّرة طازجة، ومخبوزات يومية دافئة.'],
  ['Signature warm Belgian hot chocolate, iced beverages, and specialty roasts.', 'هوت شوكليت بلجيكي دافئ ومشروبات مميزة.'],
  ['Handcrafted atelier specialties and gourmet recipes.', 'وصفات أتيليه محضّرة يدوياً بأعلى جودة.'],

  // Menu items
  ['Chocolate fudge slice', 'قطعة كيك فادج الشوكولاتة'],
  ['A thick slice of our house chocolate cake.', 'قطعة سميكة وغنية من كيك الشوكولاتة الخاص بنا.'],
  ['Carrot cake slice', 'قطعة كيك الجزر بالتوابل'],
  ['Spiced carrot cake with cream cheese frosting.', 'كيك جزر متبّل بتوابل دافئة مع كريمة الجبن المخفوقة.'],
  ['Dubai Kunafa Chocolate Crepe', 'كريب كنافة دبي بالشوكولاتة'],
  ['Hand-rolled warm crepe filled with crispy roasted kataifi pastry and Lebanese pistachio cream, drenched in Belgian milk, dark and white chocolate ribbons.', 'كريب دافئ محشو بالكنافة المحمّصة المقرمشة وكريمة الفستق اللبنانية، مغطّى بخيوط الشوكولاتة البلجيكية بالحليب والداكنة والبيضاء.'],
  ['Molten Chocolate Lava Crown', 'تاج الشوكولاتة الذائبة (مولتن لافا)'],
  ['Warm dark cocoa muffin crowned with thick, glossy melted Belgian milk-chocolate ganache.', 'مافن الكاكاو الداكن الدافئ المتوّج بغاناش الشوكولاتة البلجيكية بالحليب الذائب واللامع.'],
  ['Brownie', 'براوني بالشوكولاتة'],
  ['Dense, fudgy and dark.', 'كثيف، غني بالنكهة وذو قوام فادج داكن.'],
  ['London Layered Chocolate Cake', 'كيك لندن بطبقات الشوكولاتة'],
  ['Signature multi-layered rich dark cocoa sponge stacked with silky chocolate mousse cream and poured warm Belgian ganache.', 'كيك الإسفنج بالكاكاو الغني متعدد الطبقات مع موس الشوكولاتة الحريري وصوص الغاناش البلجيكي الدافئ.'],
  ['Mirror-Glaze Orange & Dark Torte', 'تارت الشوكولاتة الداكنة والبرتقال بميرور غلايز'],
  ['Velvety 70% dark chocolate mousse torte finished in a mirror glaze with candied orange & roasted hazelnuts.', 'تارت موس الشوكولاتة الداكنة 70% المخملية مع طلاء الميرور اللامع والبرتقال المسكّر والبندق المحمّص.'],
  ['Chocolate chip cookie', 'كوكيز رقائق الشوكولاتة'],
  ['Crisp edges, soft middle.', 'أطراف مقرمشة وقلب طري غني برقائق الشوكولاتة.'],
  ['Pistachio Kunafa Chocolate Bar', 'لوح شوكولاتة كنافة الفستق'],
  ['Thick Belgian milk or dark chocolate bar stuffed with crispy roasted kataifi pastry and vibrant pistachio cream.', 'لوح سميك من الشوكولاتة البلجيكية بالحليب أو الداكنة محشو بالكنافة المقرمشة وكريمة الفستق.'],
  ['Warm Frosted Cinnamon Rolls', 'سينامون رولز دافئة بالكريمة'],
  ['Fresh, fluffy baked cinnamon swirl rolls warm from the Aley & Aramoun ovens with silky vanilla cream icing and salted caramel or Lotus drizzle.', 'لفائف القرفة الطازجة والطرية مباشرة من أفران عاليه وعرمون مع كريمة الفانيليا وصوص الكراميل أو اللوتس.'],
  ['Hot chocolate', 'هوت شوكليت بلجيكي'],
  ['Made with melted dark chocolate and steamed milk.', 'محضّر من الشوكولاتة الداكنة الذائبة والحليب المبخّر.'],
  ['Loaded Roasted Almond & Pistachio Bark', 'لوح الشوكولاتة باللوز والفستق المحمّص'],
  ['Hand-tempered dark and milk chocolate slabs studded with caramelized almonds, pistachios and flaky sea salt.', 'ألواح شوكولاتة داكنة وبالحليب مرصّعة باللوز المكرمل والفستق الحلبي ورشّة ملح بحري.'],
  ['Pistachio Kunafa Stuffed Cookie', 'كوكيز محشوة بكنافة الفستق'],
  ['Thick soft-baked dark chocolate cookie stuffed with crunchy green pistachio kunafa cream and served with a dipping chocolate pot.', 'كوكيز شوكولاتة داكنة طرية محشوة بكريمة كنافة الفستق المقرمشة وتُقدّم مع وعاء شوكولاتة للتغميس.'],
  ['Dubai Pistachio Kunafa Éclair', 'إكلير دبي بكنافة الفستق'],
  ['Crisp golden choux pastry sliced open and generously filled with roasted kataifi pistachio cream and milk chocolate drizzle.', 'عجينة شو ذهبية مقرمشة محشوة بسخاء بكريمة الفستق والكنافة المحمّصة مع صوص الشوكولاتة بالحليب.'],
  ['Triple Belgian Chocolate Crepe', 'كريب تريبل شوكولاتة بلجيكية'],
  ['Freshly griddled golden crepe folded with dark, milk and white Belgian chocolate ribbons and hazelnut crunch.', 'كريب ذهبي طازج مطوي مع خيوط الشوكولاتة البلجيكية الداكنة وبالحليب والبيضاء وبندق مقرمش.'],
  ['Kinder & Triple Chocolate Pancakes', 'بانكيك كيندر وتريبل شوكولاتة'],
  ['Stack of fluffy golden buttermilk pancakes glazed in striped milk and white Belgian chocolate and crowned with Kinder Bueno.', 'طبقات بانكيك ذهبية هشة مغطّاة بخطوط الشوكولاتة البلجيكية بالحليب والبيضاء ومتوّجة بكيندر بوينو.'],
  ['Pistachio & Kunafa Crunch Crepe', 'كريب الفستق وكنافة مقرمشة'],
  ['Warm crepe filled with house pistachio praline, crispy kunafa threads and a drizzle of white chocolate.', 'كريب دافئ محشو ببرالين الفستق وخيوط الكنافة المقرمشة مع لمسة من الشوكولاتة البيضاء.'],
  ['Savory Oreo & Brownie Flurry', 'سافوري فلوري بالأوريو والبراوني'],
  ['Creamy soft-serve swirled with warm fudge brownie chunks, crushed Oreo cookies and Belgian chocolate sauce.', 'آيس كريم ناعم مخفوق مع قطع البراوني الدافئة وبسكويت الأوريو المطحون وصوص الشوكولاتة البلجيكية.'],
  ['Strawberry & Banana Belgian Crepe', 'كريب بلجيكي بالفراولة والموز'],
  ['Warm golden crepe topped with sliced strawberries, banana rounds, Chantilly cream rosettes, and rich melted Belgian chocolate.', 'كريب دافئ مع شرائح الفراولة والموز وكريمة الشانتيي والشوكولاتة البلجيكية الذائبة.'],
  ['Assorted Truffle & Cream Cups (4-Pack)', 'أكواب ترافل وكريمة منوّعة (4 قطع)'],
  ['Chilled takeaway profiterole and truffle dessert verrines in Pistachio Cream, Lotus Biscoff, Dark Chocolate Hazelnut, and Tiramisu.', 'أكواب تحلية باردة بنكهات كريمة الفستق واللوتس بيسكوف وشوكولاتة البندق الداكنة والتيراميسو.'],
  ['Ferrero & Hazelnut Thick Shake', 'ميلك شيك فيريرو وبندق'],
  ['Rich chocolate-hazelnut milkshake Rim-dipped in ganache and crowned with whipped cream and a praline truffle.', 'ميلك شيك الشوكولاتة بالبندق الغني مغطّس بالغاناش ومتوّج بالكريمة المخفوقة وحبّة برالين.'],
  ['Belgian Chocolate Éclair', 'إكلير الشوكولاتة البلجيكية'],
  ['Crisp choux pastry filled with silky dark chocolate diplomat cream and topped with a glossy cocoa glaze.', 'عجينة شو مقرمشة محشوة بكريمة الشوكولاتة الداكنة الحريرية ومغطّاة بطبقة كاكاو لامعة.'],
  ['Pistachio Crispy Waffle Stick', 'وافل ستيك مقرمش بالفستق'],
  ['Golden crisp Belgian waffle baked on a stick, coated in vibrant pistachio cream and festive crunch toppings.', 'وافل بلجيكي ذهبي مقرمش على عود مغطّى بكريمة الفستق الغنية وإضافات مقرمشة.'],
  ['Eid & Celebration Foil Chocolate Box', 'علبة شوكولاتة العيد والمناسبات الفاخرة'],
  ['Assortment of gold, silver and cocoa foil-wrapped Belgian praline squares presented in a ribbon-ready SAVORY Chocolate keepsake box.', 'تشكيلة شوكولاتة برالين بلجيكية مغلفة بورق ذهبي وفضي فخم داخل علبة سافوري المزينة بالشريط.'],
  ['Smoked & Roasted Mixed Nuts', 'مكسرات محمّصة ومدخّنة فاخرة'],
  ['Our house selection of smoked almonds, jumbo cashews, roasted hazelnuts and Lebanese pistachios.', 'تشكيلة سافوري الخاصة من اللوز المدخّن والكاجو الجامبو والبندق المحمّص والفستق اللبناني.'],

  // Badges
  ['VIRAL HIT · #1 REEL', 'الأكثر طلباً · الريل #1'],
  ['Best Seller', 'الأكثر مبيعاً'],
  ['TOP REEL', 'ريل مميز'],
  ["Chef's Pick", 'اختيار الشيف'],
  ['NEW LAUNCH', 'إصدار جديد'],
  ['CHEF SPECIAL', 'وصفة الشيف الخاصة'],
  ['House Favorite', 'المفضّل لدينا'],
  ['Chilled Signature', 'تحلية باردة مميزة'],
  ['CHEF SIGNATURE', 'توقيع الشيف'],
  ['LUXURY GIFTING', 'هدايا فاخرة'],
  ['Served Warm', 'يُقدّم دافئاً'],
  ['Chilled', 'مُبرّد'],
  ['Nuts & Praline', 'مكسرات وبرالين'],
  ['Belgian Cocoa', 'كاكاو بلجيكي'],

  // Product Modifiers Groups & Choices
  ['Serve it with', 'قدّمه مع'],
  ['Serve with', 'يُقدّم مع'],
  ['Drizzle Style', 'نوع الصوص'],
  ['Extras', 'إضافات'],
  ['Portion', 'الحجم'],
  ['Size', 'المقاس'],
  ['Chocolate shell', 'غلاف الشوكولاتة'],
  ['Glaze', 'التغطية'],
  ['Pack Size', 'حجم العبوة'],
  ['Weight', 'الوزن'],
  ['Finish', 'التغطية'],
  ['Toppings', 'الزينة'],
  ['Add-ons', 'إضافات اختيارية'],
  ['Assortment', 'التشكيلة'],
  ['Required', 'إلزامي'],
  ['Optional', 'اختياري'],
  ['Included', 'مشمول'],
  ['None', 'بدون'],
  ['Vanilla ice cream', 'آيس كريم فانيليا'],
  ['Whipped cream', 'كريمة مخفوقة'],
  ['Triple Chocolate & Pistachio', 'شوكولاتة ثلاثية وفستق'],
  ['Dark 70% & Pistachio', 'شوكولاتة داكنة 70% وفستق'],
  ['Extra pistachio kunafa crunch', 'كنافة فستق مقرمشة إضافية'],
  ['Fresh strawberries', 'فراولة طازجة'],
  ['Vanilla bean gelato scoop', 'كرة جيلاتو فانيليا'],
  ['Extra warm ganache pour', 'صوص غاناش دافئ إضافي'],
  ['Generous Individual Slice', 'قطعة فردية سخية'],
  ['Sharing Loaf (Serves 6–8)', 'قالب للمشاركة (يكفي 6–8 أشخاص)'],
  ['Individual Petit Gateau', 'قطعة بيتي جاتو فردية'],
  ['Sharing Torte (Serves 6–8)', 'تارت للمشاركة (يكفي 6–8 أشخاص)'],
  ['Belgian Milk Chocolate', 'شوكولاتة بلجيكية بالحليب'],
  ['70% Dark Couverture', 'شوكولاتة داكنة 70%'],
  ['Classic Cream & Caramel', 'كريمة الفانيليا والكراميل الكلاسيكي'],
  ['Lotus Biscoff Drizzle', 'صوص لوتس بيسكوف'],
  ['Belgian Chocolate Pour', 'صوص الشوكولاتة البلجيكية'],
  ['Single Warm Roll', 'قطعة واحدة دافئة'],
  ['Box of 4 Warm Rolls', 'علبة من 4 قطع دافئة'],
  ['Regular', 'عادي'],
  ['Large', 'كبير'],
  ['Marshmallows', 'مارشميلو'],
  ['250g Ballot', 'عبوة 250 غ'],
  ['500g Gift Pouch', 'عبوة هدايا 500 غ'],
  ['Milk Chocolate & Pistachio Drip', 'صوص الشوكولاتة بالحليب والفستق'],
  ['Double Dipping Chocolate Pot', 'وعاء شوكولاتة مزدوج للتغميس'],
  ['Roasted pistachios', 'فستق محمّص'],
  ['Regular Cup', 'كوب عادي'],
  ['Large Cup', 'كوب كبير'],
  ['Mixed Milk, Dark & Hazelnut Pralines', 'تشكيلة شوكولاتة بالحليب والداكنة وبرالين البندق'],
  ['Dark & Roasted Nut Reserve', 'تشكيلة الشوكولاتة الداكنة والمكسرات المحمّصة'],

  // Offers & Carousel
  ['Our #1 trending Instagram Reel creation — crisp pistachio kunafa wrapped in warm crepe and triple Belgian chocolate.', 'إبداعنا #1 على إنستغرام — كنافة فستق مقرمشة داخل كريب دافئ وثلاث طبقات شوكولاتة بلجيكية.'],
  ['Order Crepe', 'اطلب الكريب'],
  ['Because one layer of Belgian chocolate is never enough — velvety sponge, mousse and warm ganache pour.', 'لأن طبقة شوكولاتة واحدة لا تكفي — إسفنج مخملي وموس وصوص غاناش دافئ.'],
  ['Order London Cake', 'اطلب كيك لندن'],
  ['Now baked fresh daily across both Aley and Aramoun branches — glazed warm with cream icing and caramel.', 'تُخبز طازجة يومياً في فرعي عاليه وعرمون — مغطّاة بالكريمة الدافئة والكراميل.'],
  ['Order Cinnamon Rolls', 'اطلب السينامون'],
  ['SAVORY Gift Boxes & Foil Assortments', 'علب هدايا وشوكولاتة سافوري الفاخرة'],
  ['Curate 9, 16, or 25 artisan chocolates with a hand-tied satin ribbon for Eid, visits and celebrations.', 'صمّم علبة من 9 أو 16 أو 25 قطعة شوكولاتة فاخرة مع شريط ساتان للعيد والزيارات والمناسبات.'],
  ['Curate a Box', 'صمّم علبتك'],

  // Gift Box Tiers, Truffles & Ribbons
  ['SAVORY 9-Piece Assorted Gift Box', 'علبة هدايا سافوري منوّعة (9 قطع)'],
  ['SAVORY 16-Piece Luxury Gift Box', 'علبة هدايا سافوري الفاخرة (16 قطعة)'],
  ['SAVORY 25-Piece Grand Selection Box', 'علبة هدايا سافوري الكبيرة (25 قطعة)'],
  ['Pistachio Kunafa', 'كنافة الفستق'],
  ['Hazelnut Praline', 'برالين البندق'],
  ['Salted Caramel', 'كراميل مملّح'],
  ['70% Dark Ganache', 'غاناش داكن 70%'],
  ['Lotus Speculoos', 'لوتس سبيكولوس'],
  ['Raspberry Velvet', 'توت مخملي'],
  ['Arabic Coffee Roast', 'قهوة عربية محمّصة'],
  ['Almond Blanc', 'لوز وشوكولاتة بيضاء'],
  ['Deep Cocoa Satin (#4C2007)', 'ساتان كاكاو داكن (#4C2007)'],
  ['Champagne Gold', 'ذهبي شامبانيا'],
  ['Warm Ivory Silk (#F9F6EE)', 'حرير عاجي دافئ (#F9F6EE)'],
  ['Berry Velvet', 'مخملي توتي'],
  ['Deep Cocoa Satin', 'ساتان كاكاو داكن'],
  ['Butter Cream Silk', 'حرير عاجي دافئ'],

  // Instagram Reels titles
  ['Dubai Chocolate Crepe', 'كريب شوكولاتة دبي'],
  ['London Chocolate Cake', 'كيك شوكولاتة لندن'],
  ['Warm Cinnamon Rolls', 'سينامون رولز دافئة'],
  ['Pistachio Kunafa Cookie', 'كوكيز كنافة الفستق'],
  ['Kinder & Triple Pancakes', 'بانكيك كيندر والشوكولاتة'],
  ['Strawberry & Banana Crepe', 'كريب الفراولة والموز'],

  // Cake Studio groups & options
  ['Shape', 'الشكل'],
  ['Tiers', 'الطبقات'],
  ['Cake flavor', 'نكهة الكيك'],
  ['Filling', 'الحشوة'],
  ['Frosting', 'التغطية (الكريمة)'],
  ['Frosting color', 'لون التغطية'],
  ['Drip', 'الصوص المنسدل'],
  ['Toppings', 'الزينة العلوية'],
  ['Dietary needs', 'تفضيلات غذائية'],
  ['6" round', 'قالب صغير (6 إنش)'],
  ['Serves 8–10', 'يكفي 8–10 أشخاص'],
  ['8" round', 'قالب وسط (8 إنش)'],
  ['Serves 12–16', 'يكفي 12–16 شخصاً'],
  ['10" round', 'قالب كبير (10 إنش)'],
  ['Serves 20–25', 'يكفي 20–25 شخصاً'],
  ['Round', 'دائري'],
  ['The classic', 'الشكل الكلاسيكي'],
  ['Square', 'مربّع'],
  ['Clean, modern edges', 'تصميم عصري أنيق'],
  ['Heart', 'قلب'],
  ['For someone special', 'لمناسبة رومانسية خاصة'],
  ['Single tier', 'طبقة واحدة'],
  ['Two tiers', 'طبقتان'],
  ['A showstopper', 'إطلالة فخمة لافتة'],
  ['Three tiers', 'ثلاث طبقات'],
  ['For big celebrations', 'للاحتفالات الكبرى'],
  ['Dark chocolate', 'شوكولاتة داكنة'],
  ['Rich cocoa sponge', 'إسفنج كاكاو غني'],
  ['Vanilla bean', 'فانيليا طبيعية'],
  ['Classic and light', 'نكهة كلاسيكية خفيفة'],
  ['Red velvet', 'ريد فيلفت'],
  ['No filling', 'بدون حشوة'],
  ['Chocolate ganache', 'غاناش الشوكولاتة'],
  ['Salted caramel', 'كراميل مملّح'],
  ['Fresh strawberry', 'فراولة طازجة'],
  ['Chocolate buttercream', 'كريمة زبدة بالشوكولاتة'],
  ['Vanilla buttercream', 'كريمة زبدة بالفانيليا'],
  ['Cream cheese', 'كريمة الجبن'],
  ['Ivory', 'عاجي'],
  ['Blush pink', 'وردي ناعم'],
  ['Chocolate', 'شوكولاتة'],
  ['Powder blue', 'أزرق سماوي هادئ'],
  ['Sage', 'أخضر ميرمية'],
  ['Lavender', 'لافندر'],
  ['Midnight', 'أسود مخملي'],
  ['Deep black finish', 'لمسة داكنة فاخرة'],
  ['No drip', 'بدون صوص'],
  ['White chocolate', 'شوكولاتة بيضاء'],
  ['Gold', 'ذهبي'],
  ['Edible gold shimmer', 'لمعان ذهبي صالح للأكل'],
  ['Fresh berries', 'توت وفراولة طازجة'],
  ['Raspberries, blueberries and mint', 'توت أحمر وأزرق مع أوراق نعناع'],
  ['French macarons', 'ماكارون فرنسي'],
  ['Chocolate shards', 'شرائح شوكولاتة'],
  ['Gold leaf', 'ورق الذهب'],
  ['Sprinkles', 'رشة حلوى ملوّنة'],
  ['Edible flowers', 'زهور صالحة للأكل'],
  ['Cherries', 'كرز طازج'],
  ['Birthday candles', 'شموع عيد ميلاد'],
  ['Gold cake topper', 'توبّر ذهبي'],
  ['"Happy Birthday" in gold', 'عبارة عيد ميلاد سعيد بالذهب'],
  ['Sparkler candles', 'شموع شرارية احتفالية'],
  ['Gift box & ribbon', 'علبة هدايا وشريط أنيق'],
  ['Vegan', 'نباتي'],
  ['Gluten-free', 'خالي من الغلوتين'],
  ['Nut-free', 'خالي من المكسرات'],
  ['Eggless', 'خالي من البيض'],

  // Signature Cake Presets
  ['The Classic Ganache', 'الكلاسيكية بالغاناش'],
  ['Rose Garden Heart', 'قلب حديقة الورد'],
  ['Midnight Gold Grand', 'الفخامة الذهبية الداكنة'],
  ['Birthday Bliss Square', 'مربع بهجة الميلاد'],
  ['Pistachio Kunafa Royale', 'كنافة الفستق الملكية'],
  ['Imperial Ivory Wedding', 'العاجية الملكية للأعراس'],

  // Branches
  ['Aley', 'عاليه'],
  ['Aramoun', 'عرمون'],
]);

const UI_AR = new Map([
  // Search & Filter Bar
  ['Search menu…', 'ابحث في القائمة…'],
  ['All', 'الكل'],
  ['Popular', 'الأكثر طلباً'],
  ['Pistachio', 'فستق وكنافة'],
  ['Dark Chocolate', 'شوكولاتة داكنة'],
  ['← Categories', '← التصنيفات'],
  ['Show All Categories', 'عرض جميع التصنيفات'],
  ['No creations match your current search or filter.', 'لا توجد أصناف مطابقة لبحثك أو الفلتر المختار.'],
  ['Discover our signature handcrafted chocolates, warm crepes, and seasonal specials.', 'اكتشف إبداعاتنا اليدوية من الشوكولاتة، الكريب الدافئ، والعروض الموسمية.'],

  // Menu Home / Category / Product / Gift Box / Cart UI
  ['Categories', 'التصنيفات'],
  ['Build Your Own SAVORY Chocolate Box', 'صمّم علبة شوكولاتة سافوري بنفسك'],
  ['Curate a Gift Box', 'صمّم علبة هدايا'],
  ['← All Categories', '← جميع التصنيفات'],
  ['Category', 'التصنيف'],
  ['Special Requests', 'ملاحظات أو طلبات خاصة'],
  ['Allergies, packaging notes, or special requests…', 'حساسية غذائية، تغليف هدايا، أو ملاحظات خاصة…'],
  ['Add to Order', 'أضف إلى الطلب'],
  ['Closed', 'مغلق حالياً'],
  ['View Cart →', 'عرض السلّة ←'],
  ['✓ Added to Order!', '✓ تمت الإضافة للطلب!'],
  ['Selected Creations', 'الأصناف المختارة'],
  ['Remove', 'حذف'],
  ['Subtotal', 'المجموع الفرعي'],
  ['Delivery', 'التوصيل'],
  ['Pickup', 'استلام من الفرع'],
  ['Total', 'المجموع'],
  ['Checkout Details', 'تفاصيل الطلب'],
  ['Place order', 'تأكيد الطلب'],
  ['Nothing to pay now. Pay on pickup or delivery.', 'لا يوجد دفع مسبق. الدفع عند الاستلام أو التوصيل.'],
  ['Explore featured offers, handcrafted chocolates, crepes, and flurries to start your order.', 'تصفّح العروض المميزة، الشوكولاتة الفاخرة، الكريب، والفلوري لبدء طلبك.'],

  // Gift box modal
  ['SAVORY Chocolatier', 'سافوري شوكولاتييه'],
  ['Build Your Gift Box', 'صمّم علبة الهدايا'],
  ['Tap truffles below to fill your box, or let our chef fill the remaining slots.', 'اضغط على قطع الترافل أدناه لملء علبتك، أو دع الشيف يكمل الباقي.'],
  ['9 Pieces', '9 قطع'],
  ['16 Pieces', '16 قطعة'],
  ['25 Pieces', '25 قطعة'],
  ["✦ Chef's assortment", '✦ تشكيلة الشيف'],
  ['Clear', 'مسح'],
  ['Tap a chocolate to add it to your box:', 'اختر قطعة شوكولاتة لإضافتها إلى علبتك:'],
  ['Satin ribbon', 'لون الشريط الساتان'],
  ['Gift card note', 'رسالة بطاقة الإهداء'],
  ['Eid Mubarak / Happy Birthday!', 'عيد مبارك / عيد ميلاد سعيد!'],
  ['Add gift box to order', 'إضافة علبة الهدايا للطلب'],

  // Footer & Branch card
  ['Chocolatier & Cafe', 'شوكولاتييه ومقهى'],
  ['Made fresh every day', 'يُحضّر طازجاً كل يوم'],
  ['Visit our branches', 'تفضّل بزيارة فروعنا'],
  ['Opening hours', 'ساعات العمل'],
  ['Email', 'البريد الإلكتروني'],
  ['Menu & Gifting', 'القائمة والهدايا'],
  ['Build a Gift Box', 'صمّم علبة هدايا'],
  ['Cart & Checkout', 'السلّة وإتمام الطلب'],
  ['3D Custom Cake Studio ↗', 'استوديو الكيك 3D ↗'],
  ['3D Cake Studio ↗', 'استوديو الكيك 3D ↗'],
  ['SAVORY 3D Custom Studio', 'استوديو سافوري 3D'],
  ['Open Daily · Aramoun & Aley', 'مفتوح يومياً · عرمون وعاليه'],
  ['WhatsApp Concierge', 'تواصل عبر واتساب'],
  ['Featured offers & categories', 'العروض المميزة والتصنيفات'],
  ['9, 16 or 25-piece luxury boxes', 'علب فاخرة من 9 أو 16 أو 25 قطعة'],
  ['Review items & checkout', 'مراجعة الطلب وإرساله'],
  ['Live kitchen preparation status', 'تتبّع حالة التحضير مباشرة'],
  ['Aramoun & Aley locations', 'فروع عرمون وعاليه'],
  ['Fine chocolates, signature crepes, Savory Flurry, ice cream, shakes and handmade treats.', 'أجود أنواع الشوكولاتة، الكريب المميز، سافوري فلوري، البوظة والميلك شيك المحضّر يدوياً.'],

  // Checkout & customer form partials
  ['Which branch?', 'أي فرع تفضّل؟'],
  ['Pickup date', 'تاريخ الاستلام'],
  ['Pickup time', 'وقت الاستلام'],
  ['Delivery date', 'تاريخ التوصيل'],
  ['Delivery time', 'وقت التوصيل'],
  ['During opening hours.', 'ضمن ساعات العمل.'],
  ['Delivery address', 'عنوان التوصيل'],
  ['Street, number, apartment, city', 'المنطقة، الشارع، البناية، الطابق…'],
  ['Full name', 'الاسم الكامل'],
  ['Phone', 'رقم الهاتف'],
  ['Order notes', 'ملاحظات الطلب'],
  ['(optional)', '(اختياري)'],
  ['Allergies, gift wrapping or delivery instructions…', 'حساسية غذائية، تغليف هدايا أو تعليمات التوصيل…'],
  ["We're not taking online orders right now. Please give us a call instead.", 'الطلبات الإلكترونية متوقفة مؤقتاً. يرجى الاتصال بالفرع مباشرة.'],

  // 3D Cakes & Tracker
  ['INTERACTIVE 3D STUDIO', 'استوديو 3D التفاعلي'],
  ['CUSTOM CELEBRATIONS', 'كيك المناسبات الخاصة'],
  ['↗ Full 3D', '↗ عرض 3D الكامل'],
  ['Design & order', 'التصميم والطلب'],
  ['Sculpt & Size', 'الشكل والمقاس'],
  ['Shape, tiers & guest guide', 'الشكل، الطبقات وحاسبة الضيوف'],
  ['Flavors & Finish', 'النكهات والتغطية'],
  ['Sponge, drip, toppings & plaque', 'الكيك، الصوص، الزينة ولوح العبارة'],
  ['Review & Order', 'المراجعة والطلب'],
  ['Pay on pickup or delivery', 'الدفع عند الاستلام أو التوصيل'],
  ['Shape & size', 'الشكل والمقاس'],
  ['Flavor', 'النكهة'],
  ['Frosting & finish', 'الكريمة والتغطية'],
  ['Toppings & extras', 'الزينة والإضافات'],
  ['Personal touch', 'لمستك الخاصة'],
  ['Pickup or delivery', 'الاستلام أو التوصيل'],
  ['Your details', 'بياناتك'],
  ['Message', 'العبارة'],
  ['Details', 'بياناتك'],
  ['Order', 'الطلب'],
  ['Optional. Pick as many as you like.', 'اختياري. أضف ما يناسبك من الزينة والتفاصيل.'],
  ['Every choice updates the live 3D preview. Drag or touch the cake to look around it.', 'كل خيار يحدّث المعاينة ثلاثية الأبعاد مباشرة. اسحب القالب أو المس الشاشة لتدويره.'],
  ['Drag to turn ·', 'اسحب للتدوير ·'],
  ['Drag to spin ·', 'اسحب للتدوير ·'],
  ['Live preview', 'معاينة 3D مباشرة'],
  ['Your cake', 'قالبك'],
  ['Sound', 'الصوت'],
  ['Portion guide', 'حاسبة الحصص والضيوف'],
  ['How many guests are you celebrating with?', 'كم عدد الضيوف في مناسبتك؟'],
  ['Apply recommendation', 'تطبيق الاقتراح'],
  ['Message on the cake', 'العبارة على القالب'],
  ['Happy Birthday, Sam!', 'عيد ميلاد سعيد!'],
  ['Inspiration photo', 'صورة مرجعية للتصميم'],
  ['Add a photo', 'أضف صورة'],
  ['of a cake you love, a theme or colors.', 'لقالب يعجبك أو ثيم أو ألوان.'],
  ['Remove photo', 'إزالة الصورة'],
  ['JPG, PNG or HEIC, up to 8 MB. We\'ll use it as a reference for your design.', 'JPG أو PNG أو HEIC حتى 8 ميجابايت كمرجع لتصميمك.'],
  ['Design notes', 'ملاحظات التصميم'],
  ['Theme, colors, allergies, or anything else we should know.', 'الثيم، الألوان، أي حساسية أو تفاصيل إضافية.'],
  ['Place cake order', 'تأكيد طلب الكيك'],
  ['Review & order', 'مراجعة وإرسال الطلب'],
  ['Live kitchen tracker', 'المتابعة المباشرة من المطبخ'],
  ['Enter order code (e.g. SAV-7KX3QM)', 'أدخل رمز الطلب (مثال: SAV-7KX3QM)'],
  ['Order summary', 'ملخص الطلب'],
  ['SAVORY is a chocolate and sweets maker in Aramoun, Aley. We make chocolates, cakes, éclairs and ice cream, carry a wide selection of mixed nuts, and prepare chocolate favors for weddings and new arrivals.', 'سافوري هو متجر وصانع شوكولاتة وحلويات في عرمون وعاليه. نحضّر الشوكولاتة، قوالب الكيك، الإكلير، والبوظة، كما نوفّر تشكيلة واسعة من المكسرات المحمّصة وتوزيعات الشوكولاتة للأفراح والمناسبات.'],
  ['Call or WhatsApp us for today\'s opening hours.', 'تواصل معنا هاتفياً أو عبر واتساب لمعرفة ساعات العمل اليومية.'],
  ['Chocolates, cakes and ice cream, made in Aramoun, Aley.', 'شوكولاتة وكيك وبوظة محضّرة يدوياً في عرمون وعاليه.'],
  ['Khoury Center, Aley, Mount Lebanon', 'مركز الخوري، عاليه، جبل لبنان'],
  ['Main Road, Aramoun, Aley, Mount Lebanon', 'الطريق العام، عرمون، عاليه، جبل لبنان'],
  ['Directions ↗', 'الموقع على الخريطة ↗'],
  ['Directions →', 'الموقع على الخريطة ←'],
  ['Get directions →', 'الموقع على الخريطة ←'],
  ['Directions', 'الموقع على الخريطة'],
  ['WhatsApp', 'واتساب'],
  ['Address', 'العنوان'],
  ['Aley branch', 'فرع عاليه'],
  ['Aramoun branch', 'فرع عرمون'],
  ['Chat with a branch', 'تواصل مع أحد الفروع'],
  ['Website crafted by', 'تصميم وتطوير'],
  ['Website by', 'تصميم'],
  ['Website by OMVI', 'تصميم OMVI'],
]);

/** Looks up Arabic text for catalog or UI labels while respecting current UI language. */
export function tr(text, forceAr = isAr()) {
  const s = String(text ?? '');
  if (!forceAr || !s) return s;
  const direct = CATALOG_AR.get(s) || UI_AR.get(s) || CATALOG_AR.get(s.trim()) || UI_AR.get(s.trim());
  if (direct) return direct;
  const trimmed = s.trim();
  if (/^Call\s+/i.test(trimmed)) return `اتصال \u2066${trimmed.replace(/^Call\s+/i, '')}\u2069`;
  if (/^WhatsApp\s+/i.test(trimmed)) return `واتساب \u2066${trimmed.replace(/^WhatsApp\s+/i, '')}\u2069`;
  if (/\s+branch$/i.test(trimmed)) {
    const base = trimmed.replace(/\s+branch$/i, '');
    return `فرع ${CATALOG_AR.get(base) || base}`;
  }
  return s;
}

/** Builds a normalized bilingual search index string for any catalog item. */
export function buildItemSearchIndex(item) {
  const parts = [
    item.name,
    CATALOG_AR.get(item.name),
    item.description,
    CATALOG_AR.get(item.description),
    item.category,
    CATALOG_AR.get(item.category),
    item.offer_badge,
    CATALOG_AR.get(item.offer_badge),
  ];
  for (const g of item.options || []) {
    parts.push(g.name, CATALOG_AR.get(g.name));
    for (const c of g.choices || []) {
      parts.push(c.name, CATALOG_AR.get(c.name));
    }
  }
  const enLower = `${item.name} ${item.description} ${item.category}`.toLowerCase();
  if (/crepe/.test(enLower)) parts.push('كريب كربس');
  if (/waffle/.test(enLower)) parts.push('وافل');
  if (/pancake/.test(enLower)) parts.push('بانكيك بان كيك');
  if (/kunafa|kataifi/.test(enLower)) parts.push('كنافة كنافه قطايف دبي');
  if (/pistachio/.test(enLower)) parts.push('فستق حلبي');
  if (/chocolate|cocoa|ganache/.test(enLower)) parts.push('شوكولا شوكولاته كاكاو غاناش');
  if (/dark|70%/.test(enLower)) parts.push('داكن غامق مر');
  if (/cake|torte|fudge|slice/.test(enLower)) parts.push('كيك تورته جاتو قالب حلوى');
  if (/cookie/.test(enLower)) parts.push('كوكيز بسكويت');
  if (/brownie/.test(enLower)) parts.push('براوني');
  if (/eclair|éclair/.test(enLower)) parts.push('اكلير إكلير');
  if (/flurry|ice cream/.test(enLower)) parts.push('فلوري بوظه ايس كريم مثلجات');
  if (/shake/.test(enLower)) parts.push('ميلك شيك شيك');
  if (/cinnamon/.test(enLower)) parts.push('سينابون سينامون قرفه قرفة');
  if (/nut|almond|hazelnut|cashew/.test(enLower)) parts.push('مكسرات لوز بندق كاجو');
  if (/box|gift|eid/.test(enLower)) parts.push('علبه هدايا عيد ضيافه');
  return normalizeSearchText(parts.filter(Boolean).join(' '));
}

export const TRACK_STAGE_AR = new Map([
  ['new', { label: 'تم استلام الطلب', desc: 'طلبك في قائمة الانتظار وبانتظار تأكيد الفرع.' }],
  ['confirmed', { label: 'تم التأكيد', desc: 'أكّد فريقنا طلبك وجدول وقت التحضير.' }],
  ['baking', { label: 'قيد التحضير', desc: 'يُحضّر طلبك الآن طازجاً في مطبخ سافوري.' }],
  ['ready', { label: 'جاهز!', desc: 'مغلّف وطازج وجاهز للاستلام أو في طريقه إليك.' }],
  ['completed', { label: 'مكتمل', desc: 'تم التسليم — شكراً لاختيارك سافوري!' }],
]);

export function trPairNote(enNote, forceAr = isAr()) {
  if (!forceAr) return enNote;
  const map = new Map([
    ['Enjoy warm with a scoop of Madagascar vanilla gelato or double espresso.', 'استمتع به دافئاً مع كرة جيلاتو فانيليا أو إسبريسو مزدوج.'],
    ['Pairs effortlessly with a warm Belgian chocolate brownie or pistachio kunafa bar.', 'يتناغم بشكل رائع مع قطعة براوني دافئة أو لوح شوكولاتة كنافة الفستق.'],
    ['Hand-tempered for gifting — pairs beautifully with roasted Arabic coffee.', 'محضّر خصيصاً للإهداء — يتكامل مع القهوة العربية المحمّصة.'],
    ['Freshly crafted to order in our Aramoun & Aley kitchens.', 'يُحضّر طازجاً عند الطلب في مطابخنا في عرمون وعاليه.'],
  ]);
  return map.get(enNote) || enNote;
}

export function trTastingNote(enNote, forceAr = isAr()) {
  if (!forceAr) return enNote;
  const map = new Map([
    ['Balanced cocoa depth with a velvety patisserie crumb.', 'توازن غني في نكهة الكاكاو مع قوام مخملي ناعم.'],
    ['Deep roasted Belgian cocoa profile with a luxurious Truffle-like finish.', 'كاكاو بلجيكي محمّص بعمق مع لمسة ترافل فاخرة.'],
    ['Warm roasted nutty notes paired with caramelized Levantine indulgence.', 'نكهات المكسرات المحمّصة الدافئة مع الكراميل الشامي الغني.'],
    ['Bright orchard fruit acidity cuts through the silky cream layers.', 'انتعاش الفواكه الطازجة يكسر غنى طبقات الكريمة الحريرية.'],
    ['Aromatic Madagascar vanilla bean crumb — a crowd-pleasing celebration classic.', 'فانيليا مدغشقر العطرية بقوام خفيف — خيار احتفالي محبّب للجميع.'],
  ]);
  return map.get(enNote) || enNote;
}
