import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { CAKE_SEEDS } from './cake-groups.js';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'app.db');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const isNew = !fs.existsSync(DB_FILE);

export const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// ---------- Version 1: the original schema ----------

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    admin_id   INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category    TEXT NOT NULL DEFAULT 'Other',
    price_cents INTEGER NOT NULL,
    image       TEXT,
    available   INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cake_options (
    id          INTEGER PRIMARY KEY,
    type        TEXT NOT NULL CHECK (type IN ('size', 'flavor', 'filling', 'frosting')),
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL DEFAULT 0,
    available   INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY,
    code           TEXT NOT NULL UNIQUE,
    type           TEXT NOT NULL CHECK (type IN ('menu', 'cake')),
    status         TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new', 'confirmed', 'baking', 'ready', 'completed', 'cancelled')),
    customer_name  TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT NOT NULL DEFAULT '',
    pickup_date    TEXT NOT NULL,
    pickup_time    TEXT NOT NULL,
    notes          TEXT NOT NULL DEFAULT '',
    total_cents    INTEGER NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Names and prices are copied onto the order so later menu edits
  -- never change what a customer already ordered.
  CREATE TABLE IF NOT EXISTS order_items (
    id               INTEGER PRIMARY KEY,
    order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    quantity         INTEGER NOT NULL,
    details          TEXT NOT NULL DEFAULT '{}'
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);
`);

if (isNew) seedVersion1();

// ---------- Later versions ----------

const MIGRATIONS = [
  null, // version 1 is the schema above
  migrateToVersion2,
  migrateToVersion3,
  migrateToVersion4,
  migrateToVersion5,
  migrateToVersion6,
  migrateToVersion7,
  migrateToVersion8,
  migrateToVersion9,
  migrateToVersion10,
  migrateToVersion11,
  migrateToVersion12,
];
const LATEST = MIGRATIONS.length;

let version = db.prepare('PRAGMA user_version').get().user_version || 1;
if (version < LATEST && !isNew) backup(version);
while (version < LATEST) {
  transaction(() => {
    MIGRATIONS[version]();
    version += 1;
    db.exec(`PRAGMA user_version = ${version}`);
  });
}

// Copies the database before an upgrade, e.g. data/app.backup-v1-2026-10-16.db
function backup(fromVersion) {
  const target = path.join(DATA_DIR, `app.backup-v${fromVersion}-${new Date().toISOString().slice(0, 10)}.db`);
  if (!fs.existsSync(target)) {
    db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
    console.log(`Backed up the database to ${target} before upgrading it.`);
  }
}

// Version 8: infuse authentic media & products extracted from @savory.chocolate Instagram and Facebook.
function migrateToVersion8() {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('email', 'info@savory-chocolate.com')
    ON CONFLICT(key) DO UPDATE SET value = CASE WHEN trim(value) = '' THEN 'info@savory-chocolate.com' ELSE value END
  `).run();

  db.prepare("UPDATE branches SET address = 'Khoury Center, Aley, Mount Lebanon' WHERE name = 'Aley' AND address = 'Aley, Mount Lebanon'").run();
  db.prepare("UPDATE branches SET address = 'Main Road, Aramoun, Aley, Mount Lebanon' WHERE name = 'Aramoun' AND address = 'Aramoun, Aley, Mount Lebanon'").run();

  const itemExists = db.prepare('SELECT id FROM menu_items WHERE name = ?');
  const insertSocialItem = db.prepare(`
    INSERT INTO menu_items (name, description, category, price_cents, compare_price_cents, featured, offer_badge, image, options, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const socialItems = [
    [
      'Dubai Kunafa Chocolate Crepe',
      'Hand-rolled warm crepe filled with crispy roasted kataifi pastry and Lebanese pistachio cream, drenched in Belgian milk, dark and white chocolate ribbons.',
      'Crepes & Waffles',
      950,
      1100,
      1,
      'VIRAL HIT · #1 REEL',
      '/img/social/reel-dubai-crepe.webp',
      JSON.stringify([
        { name: 'Drizzle Style', type: 'single', required: true, choices: [{ name: 'Triple Chocolate & Pistachio', price_cents: 0 }, { name: 'Dark 70% & Pistachio', price_cents: 50 }] },
        { name: 'Extras', type: 'multi', required: false, choices: [{ name: 'Extra pistachio kunafa crunch', price_cents: 200 }, { name: 'Fresh strawberries', price_cents: 150 }] },
      ]),
      1,
    ],
    [
      'London Layered Chocolate Cake',
      'Signature multi-layered rich dark cocoa sponge stacked with silky chocolate mousse cream and poured warm Belgian ganache.',
      'Signature Gateaux & Bakes',
      850,
      0,
      1,
      'TOP REEL',
      '/img/social/reel-london-cake.webp',
      JSON.stringify([
        { name: 'Portion', type: 'single', required: true, choices: [{ name: 'Generous Individual Slice', price_cents: 0 }, { name: 'Sharing Loaf (Serves 6–8)', price_cents: 1950 }] },
      ]),
      2,
    ],
    [
      'Warm Frosted Cinnamon Rolls',
      'Fresh, fluffy baked cinnamon swirl rolls warm from the Aley & Aramoun ovens with silky vanilla cream icing and salted caramel or Lotus drizzle.',
      'Bakes',
      550,
      0,
      1,
      'NEW LAUNCH',
      '/img/social/reel-cinnamon-rolls.webp',
      JSON.stringify([
        { name: 'Glaze', type: 'single', required: true, choices: [{ name: 'Classic Cream & Caramel', price_cents: 0 }, { name: 'Lotus Biscoff Drizzle', price_cents: 100 }, { name: 'Belgian Chocolate Pour', price_cents: 100 }] },
        { name: 'Pack Size', type: 'single', required: true, choices: [{ name: 'Single Warm Roll', price_cents: 0 }, { name: 'Box of 4 Warm Rolls', price_cents: 1400 }] },
      ]),
      3,
    ],
    [
      'Pistachio Kunafa Stuffed Cookie',
      'Thick soft-baked dark chocolate cookie stuffed with crunchy green pistachio kunafa cream and served with a dipping chocolate pot.',
      'Bakes',
      500,
      0,
      1,
      'CHEF SPECIAL',
      '/img/social/reel-kunafa-cookie.webp',
      JSON.stringify([
        { name: 'Finish', type: 'single', required: false, choices: [{ name: 'Milk Chocolate & Pistachio Drip', price_cents: 0 }, { name: 'Double Dipping Chocolate Pot', price_cents: 150 }] },
      ]),
      4,
    ],
    [
      'Dubai Pistachio Kunafa Éclair',
      'Crisp golden choux pastry sliced open and generously filled with roasted kataifi pistachio cream and milk chocolate drizzle.',
      'Signature Gateaux & Bakes',
      550,
      0,
      0,
      '',
      '/img/social/ig-kunafa-eclair.webp',
      '[]',
      5,
    ],
    [
      'Kinder & Triple Chocolate Pancakes',
      'Stack of fluffy golden buttermilk pancakes glazed in striped milk and white Belgian chocolate and crowned with Kinder Bueno.',
      'Crepes & Waffles',
      850,
      0,
      0,
      '',
      '/img/social/reel-pancakes.webp',
      JSON.stringify([
        { name: 'Add-ons', type: 'multi', required: false, choices: [{ name: 'Fresh strawberries', price_cents: 150 }, { name: 'Vanilla gelato scoop', price_cents: 200 }] },
      ]),
      6,
    ],
    [
      'Strawberry & Banana Belgian Crepe',
      'Warm golden crepe topped with sliced strawberries, banana rounds, Chantilly cream rosettes, and rich melted Belgian chocolate.',
      'Crepes & Waffles',
      850,
      0,
      0,
      '',
      '/img/social/reel-strawberry-crepe.webp',
      '[]',
      7,
    ],
    [
      'Assorted Truffle & Cream Cups (4-Pack)',
      'Chilled takeaway profiterole and truffle dessert verrines in Pistachio Cream, Lotus Biscoff, Dark Chocolate Hazelnut, and Tiramisu.',
      'Chocolates & Bark',
      1100,
      0,
      0,
      '',
      '/img/social/menu-dessert-cups.webp',
      '[]',
      8,
    ],
    [
      'Pistachio Crispy Waffle Stick',
      'Golden crisp Belgian waffle baked on a stick, coated in vibrant pistachio cream and festive crunch toppings.',
      'Crepes & Waffles',
      650,
      0,
      0,
      '',
      '/img/social/menu-pistachio-waffle.webp',
      '[]',
      9,
    ],
    [
      'Eid & Celebration Foil Chocolate Box',
      'Assortment of gold, silver and cocoa foil-wrapped Belgian praline squares presented in a ribbon-ready SAVORY Chocolate keepsake box.',
      'Chocolates & Bark',
      2400,
      0,
      0,
      '',
      '/img/social/gift-eid-box.webp',
      JSON.stringify([
        { name: 'Assortment', type: 'single', required: true, choices: [{ name: 'Mixed Milk, Dark & Hazelnut Pralines', price_cents: 0 }, { name: 'Dark & Roasted Nut Reserve', price_cents: 300 }] },
      ]),
      10,
    ],
  ];

  for (const row of socialItems) {
    if (!itemExists.get(row[0])) insertSocialItem.run(...row);
  }

  // Upgrade existing menu item photos with real extracted SAVORY social media photography.
  const setPhoto = db.prepare("UPDATE menu_items SET image = ? WHERE name = ? AND (image IS NULL OR image = '' OR image IN ('/img/onboarding-crepe.jpg', '/img/onboarding-flurry.jpg', '/img/onboarding-crepe.webp', '/img/onboarding-flurry.webp'))");
  setPhoto.run('/img/social/reel-london-cake.webp', 'Molten Chocolate Lava Crown');
  setPhoto.run('/img/social/cake-heart-chocolate.webp', 'Mirror-Glaze Orange & Dark Torte');
  setPhoto.run('/img/social/ig-savory-box.webp', 'Loaded Roasted Almond & Pistachio Bark');
  setPhoto.run('/img/social/reel-strawberry-crepe.webp', 'Triple Belgian Chocolate Crepe');
  setPhoto.run('/img/social/reel-dubai-crepe.webp', 'Pistachio & Kunafa Crunch Crepe');
  setPhoto.run('/img/social/menu-icecream-cup.webp', 'Savory Oreo & Brownie Flurry');
  setPhoto.run('/img/social/menu-dessert-cups.webp', 'Ferrero & Hazelnut Thick Shake');
  setPhoto.run('/img/social/ig-kunafa-eclair.webp', 'Belgian Chocolate Éclair');
  setPhoto.run('/img/social/ig-savory-box.webp', 'Smoked & Roasted Mixed Nuts');
  setPhoto.run('/img/social/reel-london-cake.webp', 'Chocolate fudge slice');
  setPhoto.run('/img/social/cake-floral-pink.webp', 'Carrot cake slice');
  setPhoto.run('/img/social/ig-kunafa-cookie-drip.webp', 'Brownie');
  setPhoto.run('/img/social/reel-kunafa-cookie.webp', 'Chocolate chip cookie');
  setPhoto.run('/img/social/reel-sunday-boutique.webp', 'Hot chocolate');

  // Upgrade default onboarding slides to real @savory.chocolate Instagram Reels.
  const hasOnlySeedSlides = db.prepare("SELECT COUNT(*) AS n FROM onboarding_slides WHERE media_url NOT LIKE '/img/onboarding-%'").get().n === 0;
  if (hasOnlySeedSlides) {
    db.prepare('DELETE FROM onboarding_slides').run();
    const addSlide = db.prepare('INSERT INTO onboarding_slides (media_type, media_url, caption, available, sort_order) VALUES (?, ?, ?, 1, ?)');
    addSlide.run('video', '/img/social/reel-dubai-crepe.mp4', 'Dubai Chocolate Crepe · @savory.chocolate', 0);
    addSlide.run('video', '/img/social/reel-london-cake.mp4', 'London Layered Chocolate Cake · Aley & Aramoun', 1);
    addSlide.run('video', '/img/social/reel-cinnamon-rolls.mp4', 'Warm Frosted Cinnamon Rolls · New Launch', 2);
    addSlide.run('video', '/img/social/reel-kunafa-cookie.mp4', 'Pistachio Kunafa Stuffed Cookies', 3);
    addSlide.run('video', '/img/social/reel-strawberry-crepe.mp4', 'Strawberry & Banana Belgian Crepe', 4);
  }

  // Refresh default offers slider to showcase real social hits and link directly to their products.
  const hasOnlySeedOffers = db.prepare("SELECT COUNT(*) AS n FROM offers WHERE image NOT LIKE '/img/onboarding-%'").get().n === 0;
  if (hasOnlySeedOffers) {
    db.prepare('DELETE FROM offers').run();
    const dubaiCrepe = itemExists.get('Dubai Kunafa Chocolate Crepe');
    const londonCake = itemExists.get('London Layered Chocolate Cake');
    const cinnamonRolls = itemExists.get('Warm Frosted Cinnamon Rolls');
    const addOffer = db.prepare(`
      INSERT INTO offers (title, subtitle, badge, image, cta_text, target_type, target_value, available, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    addOffer.run(
      'Dubai Kunafa Chocolate Crepe',
      'Our #1 trending Instagram Reel creation — crisp pistachio kunafa wrapped in warm crepe and triple Belgian chocolate.',
      'VIRAL HIT · #1 REEL',
      '/img/social/reel-dubai-crepe.webp',
      'Order Crepe',
      dubaiCrepe ? 'product' : 'category',
      dubaiCrepe ? String(dubaiCrepe.id) : 'Crepes & Waffles',
      0,
    );
    addOffer.run(
      'London Layered Chocolate Cake',
      'Because one layer of Belgian chocolate is never enough — velvety sponge, mousse and warm ganache pour.',
      'CHEF SIGNATURE',
      '/img/social/reel-london-cake.webp',
      'Order London Cake',
      londonCake ? 'product' : 'category',
      londonCake ? String(londonCake.id) : 'Signature Gateaux & Bakes',
      1,
    );
    addOffer.run(
      'Warm Frosted Cinnamon Rolls',
      'Now baked fresh daily across both Aley and Aramoun branches — glazed warm with cream icing and caramel.',
      'NEW LAUNCH',
      '/img/social/reel-cinnamon-rolls.webp',
      'Order Cinnamon Rolls',
      cinnamonRolls ? 'product' : 'category',
      cinnamonRolls ? String(cinnamonRolls.id) : 'Bakes',
      2,
    );
    addOffer.run(
      'SAVORY Gift Boxes & Foil Assortments',
      'Curate 9, 16, or 25 artisan chocolates with a hand-tied satin ribbon for Eid, visits and celebrations.',
      'LUXURY GIFTING',
      '/img/social/gift-eid-box.webp',
      'Curate a Box',
      'box',
      '16',
      3,
    );
  }

  // Populate Gallery with SAVORY's real custom cakes & storefront creations if empty.
  if (db.prepare('SELECT COUNT(*) AS n FROM gallery_images').get().n === 0) {
    const addGallery = db.prepare('INSERT INTO gallery_images (image, caption, sort_order) VALUES (?, ?, ?)');
    [
      ['/img/social/cake-heart-chocolate.webp', 'Hand-glazed dark chocolate heart cake with gold piping', 0],
      ['/img/social/cake-floral-pink.webp', 'Artisan blush buttercream ruffle celebration cake', 1],
      ['/img/social/gift-eid-box.webp', 'Signature foil-wrapped Belgian chocolates in a SAVORY gift box', 2],
      ['/img/social/cake-strawberry-hearts.webp', 'Fresh strawberry & Chantilly celebration cake', 3],
      ['/img/social/cake-valentine-ribbons.webp', 'Satin-ribbon heart celebration cake', 4],
      ['/img/social/cake-red-velvet-heart.webp', 'Three-layer Red Velvet heart cake with cream cheese frosting', 5],
      ['/img/social/cake-unicorn-tiers.webp', 'Four-tier pastel unicorn celebration cake', 6],
      ['/img/social/cake-butterfly-lavender.webp', 'Lavender & blush buttercream rosette celebration cake', 7],
      ['/img/social/menu-dessert-cups.webp', 'Assorted profiterole & truffle cups: Pistachio, Lotus & Tiramisu', 8],
      ['/img/social/menu-donuts-platter.webp', 'Pastel glazed artisan celebration donuts', 9],
      ['/img/social/menu-pistachio-waffle.webp', 'Pistachio cream crisp waffle stick', 10],
      ['/img/social/shop-aley-boutique.webp', 'Inside the SAVORY Chocolate boutique in Aley', 11],
    ].forEach(([img, cap, order]) => addGallery.run(img, cap, order));
  }
}

// Version 9: refine photo-to-caption match in gallery and mixed nuts packaging photo.
function migrateToVersion9() {
  db.prepare(`
    UPDATE gallery_images
    SET caption = 'Lavender & blush buttercream rosette celebration cake'
    WHERE image = '/img/social/cake-butterfly-lavender.jpg'
      AND caption = 'Lavender rosette & butterfly floral cake'
  `).run();

  db.prepare(`
    UPDATE menu_items
    SET image = '/img/social/ig-savory-box.jpg'
    WHERE name = 'Smoked & Roasted Mixed Nuts'
      AND image = '/img/social/gift-eid-box.jpg'
  `).run();
}

// Version 10: keep onboarding background stage 100% looping video reels.
function migrateToVersion10() {
  db.prepare(`
    UPDATE onboarding_slides
    SET media_type = 'video',
        media_url = '/img/social/reel-strawberry-crepe.mp4',
        caption = 'Strawberry & Banana Belgian Crepe'
    WHERE media_url = '/img/social/gift-eid-box.jpg'
       OR media_url = '/img/social/gift-eid-box.webp'
  `).run();
}

// Version 11: serve optimized WebP imagery across default storefront photography.
function migrateToVersion11() {
  db.prepare("UPDATE menu_items SET image = REPLACE(image, '.jpg', '.webp') WHERE image LIKE '/img/%.jpg'").run();
  db.prepare("UPDATE offers SET image = REPLACE(image, '.jpg', '.webp') WHERE image LIKE '/img/%.jpg'").run();
  db.prepare("UPDATE onboarding_slides SET media_url = REPLACE(media_url, '.jpg', '.webp') WHERE media_url LIKE '/img/%.jpg'").run();
  db.prepare("UPDATE gallery_images SET image = REPLACE(image, '.jpg', '.webp') WHERE image LIKE '/img/%.jpg'").run();
}

// Version 12: which branches sell each menu item. A JSON list of branch ids; an empty list means every branch.
function migrateToVersion12() {
  db.exec("ALTER TABLE menu_items ADD COLUMN branch_ids TEXT NOT NULL DEFAULT '[]'");
}

// Version 7: featured item flags on menu_items, admin-managed offers slider, and onboarding background media slides.
function migrateToVersion7() {
  const cols = new Set(db.prepare('PRAGMA table_info(menu_items)').all().map((c) => c.name));
  if (!cols.has('featured')) db.exec('ALTER TABLE menu_items ADD COLUMN featured INTEGER NOT NULL DEFAULT 0');
  if (!cols.has('offer_badge')) db.exec("ALTER TABLE menu_items ADD COLUMN offer_badge TEXT NOT NULL DEFAULT ''");
  if (!cols.has('compare_price_cents')) db.exec('ALTER TABLE menu_items ADD COLUMN compare_price_cents INTEGER NOT NULL DEFAULT 0');

  db.exec(`
    CREATE TABLE IF NOT EXISTS offers (
      id           INTEGER PRIMARY KEY,
      title        TEXT NOT NULL,
      subtitle     TEXT NOT NULL DEFAULT '',
      badge        TEXT NOT NULL DEFAULT '',
      image        TEXT NOT NULL DEFAULT '',
      cta_text     TEXT NOT NULL DEFAULT 'Explore',
      target_type  TEXT NOT NULL DEFAULT 'category' CHECK (target_type IN ('product', 'category', 'box', 'none')),
      target_value TEXT NOT NULL DEFAULT '',
      available    INTEGER NOT NULL DEFAULT 1,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS onboarding_slides (
      id         INTEGER PRIMARY KEY,
      media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
      media_url  TEXT NOT NULL,
      caption    TEXT NOT NULL DEFAULT '',
      available  INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Promote signature items into the featured slider and attach matching imagery where absent.
  const markFeatured = db.prepare(`
    UPDATE menu_items
    SET featured = 1,
        offer_badge = CASE WHEN offer_badge = '' THEN ? ELSE offer_badge END,
        compare_price_cents = CASE WHEN compare_price_cents = 0 THEN ? ELSE compare_price_cents END,
        image = COALESCE(image, ?)
    WHERE name = ?
  `);
  markFeatured.run("Chef's Pick", 0, '/img/onboarding-kunafa.webp', 'Pistachio Kunafa Chocolate Bar');
  markFeatured.run('Best Seller', 800, null, 'Molten Chocolate Lava Crown');
  markFeatured.run('House Favorite', 0, '/img/onboarding-crepe.webp', 'Triple Belgian Chocolate Crepe');
  markFeatured.run('Chilled Signature', 0, '/img/onboarding-flurry.webp', 'Savory Oreo & Brownie Flurry');

  if (db.prepare('SELECT COUNT(*) AS n FROM offers').get().n === 0) {
    const kunafa = db.prepare('SELECT id FROM menu_items WHERE name = ?').get('Pistachio Kunafa Chocolate Bar');
    const addOffer = db.prepare(`
      INSERT INTO offers (title, subtitle, badge, image, cta_text, target_type, target_value, available, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    addOffer.run(
      'Pistachio Kunafa Collection',
      'Hand-tempered Belgian chocolate shells filled with roasted kataifi pastry and vibrant Lebanese pistachio cream.',
      'SIGNATURE OFFER',
      '/img/onboarding-kunafa.webp',
      'Order Bar',
      kunafa ? 'product' : 'category',
      kunafa ? String(kunafa.id) : 'Chocolates & Bark',
      0,
    );
    addOffer.run(
      'Bespoke Satin Truffle Gift Boxes',
      'Curate 9, 16, or 25 artisan pralines and kunafa truffles presented with a hand-tied ribbon.',
      'LUXURY GIFTING',
      '/img/onboarding-box.webp',
      'Curate a Box',
      'box',
      '16',
      1,
    );
    addOffer.run(
      'Warm Belgian Chocolate Crepes',
      'Griddled to order and folded with triple Belgian dark, milk, and white chocolate plus roasted hazelnuts.',
      'FRESH FROM GRIDDLE',
      '/img/onboarding-crepe.webp',
      'Browse Crepes',
      'category',
      'Crepes & Waffles',
      2,
    );
  }

  if (db.prepare('SELECT COUNT(*) AS n FROM onboarding_slides').get().n === 0) {
    const addSlide = db.prepare(`
      INSERT INTO onboarding_slides (media_type, media_url, caption, available, sort_order)
      VALUES (?, ?, ?, 1, ?)
    `);
    addSlide.run('video', '/img/onboarding-reel.mp4', 'Handcrafted in Aramoun & Aley', 0);
    addSlide.run('image', '/img/onboarding-box.webp', 'Luxury Satin Truffle Boxes', 1);
    addSlide.run('image', '/img/onboarding-kunafa.webp', 'Pistachio Kunafa Chocolate Bars', 2);
    addSlide.run('image', '/img/onboarding-crepe.webp', 'Warm Belgian Chocolate Crepes', 3);
    addSlide.run('image', '/img/onboarding-flurry.webp', 'Signature Savory Flurry', 4);
  }
}

// Version 6: seed SAVORY's full chocolatier & patisserie menu items and customer reviews.
function migrateToVersion6() {
  const exists = db.prepare('SELECT id FROM menu_items WHERE name = ?');
  const insertItem = db.prepare(`
    INSERT INTO menu_items (name, description, category, price_cents, options, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const extraItems = [
    [
      'Molten Chocolate Lava Crown',
      'Warm dark cocoa muffin crowned with thick, glossy melted Belgian milk-chocolate ganache.',
      'Signature Gateaux & Bakes',
      650,
      JSON.stringify([
        { name: 'Serve with', type: 'single', required: false, choices: [{ name: 'Vanilla bean gelato scoop', price_cents: 200 }, { name: 'Extra warm ganache pour', price_cents: 150 }] },
      ]),
      1,
    ],
    [
      'Mirror-Glaze Orange & Dark Torte',
      'Velvety 70% dark chocolate mousse torte finished in a mirror glaze with candied orange & roasted hazelnuts.',
      'Signature Gateaux & Bakes',
      2800,
      JSON.stringify([
        { name: 'Size', type: 'single', required: true, choices: [{ name: 'Individual Petit Gateau', price_cents: 0 }, { name: 'Sharing Torte (Serves 6–8)', price_cents: 1400 }] },
      ]),
      2,
    ],
    [
      'Pistachio Kunafa Chocolate Bar',
      'Thick Belgian milk or dark chocolate bar stuffed with crispy roasted kataifi pastry and vibrant pistachio cream.',
      'Chocolates & Bark',
      950,
      JSON.stringify([
        { name: 'Chocolate shell', type: 'single', required: true, choices: [{ name: 'Belgian Milk Chocolate', price_cents: 0 }, { name: '70% Dark Couverture', price_cents: 50 }] },
      ]),
      3,
    ],
    [
      'Loaded Roasted Almond & Pistachio Bark',
      'Hand-tempered dark and milk chocolate slabs studded with caramelized almonds, pistachios and flaky sea salt.',
      'Chocolates & Bark',
      1400,
      JSON.stringify([
        { name: 'Weight', type: 'single', required: true, choices: [{ name: '250g Ballot', price_cents: 0 }, { name: '500g Gift Pouch', price_cents: 1200 }] },
      ]),
      4,
    ],
    [
      'Triple Belgian Chocolate Crepe',
      'Freshly griddled golden crepe folded with dark, milk and white Belgian chocolate ribbons and hazelnut crunch.',
      'Crepes & Waffles',
      750,
      JSON.stringify([
        { name: 'Add-ons', type: 'multi', required: false, choices: [{ name: 'Roasted pistachios', price_cents: 150 }, { name: 'Fresh strawberries', price_cents: 150 }, { name: 'Vanilla ice cream', price_cents: 200 }] },
      ]),
      5,
    ],
    [
      'Pistachio & Kunafa Crunch Crepe',
      'Warm crepe filled with house pistachio praline, crispy kunafa threads and a drizzle of white chocolate.',
      'Crepes & Waffles',
      850,
      '[]',
      6,
    ],
    [
      'Savory Oreo & Brownie Flurry',
      'Creamy soft-serve swirled with warm fudge brownie chunks, crushed Oreo cookies and Belgian chocolate sauce.',
      'Savory Flurry & Shakes',
      600,
      JSON.stringify([
        { name: 'Size', type: 'single', required: true, choices: [{ name: 'Regular Cup', price_cents: 0 }, { name: 'Large Cup', price_cents: 150 }] },
      ]),
      7,
    ],
    [
      'Ferrero & Hazelnut Thick Shake',
      'Rich chocolate-hazelnut milkshake Rim-dipped in ganache and crowned with whipped cream and a praline truffle.',
      'Savory Flurry & Shakes',
      700,
      '[]',
      8,
    ],
    [
      'Belgian Chocolate Éclair',
      'Crisp choux pastry filled with silky dark chocolate diplomat cream and topped with a glossy cocoa glaze.',
      'Signature Gateaux & Bakes',
      450,
      '[]',
      9,
    ],
    [
      'Smoked & Roasted Mixed Nuts',
      'Our house selection of smoked almonds, jumbo cashews, roasted hazelnuts and Lebanese pistachios.',
      'Chocolates & Bark',
      1200,
      '[]',
      10,
    ],
  ];
  for (const row of extraItems) {
    if (!exists.get(row[0])) insertItem.run(...row);
  }

  const reviewCount = db.prepare('SELECT COUNT(*) AS n FROM reviews').get().n;
  if (reviewCount === 0) {
    const addRev = db.prepare('INSERT INTO reviews (name, text, rating, sort_order) VALUES (?, ?, ?, ?)');
    addRev.run('Nour K.', 'We designed our engagement cake in the 3D studio and it arrived looking even more breathtaking in real life. The dark chocolate ganache and pistachio layer were unforgettable!', 5, 0);
    addRev.run('Rami H.', 'The best chocolates and crepes in Aramoun and Aley. Their custom 16-piece chocolate gift box with the satin ribbon is now our go-to gift for every family visit.', 5, 1);
    addRev.run('Maya S.', 'Ordered a custom birthday cake and tracked it live right until pickup. Super smooth experience and the cake was fresh, rich, and not overly sweet.', 5, 2);
  }
}

// Version 5: allow 'baking' ("In the Kitchen") status on orders.
function migrateToVersion5() {
  db.exec(`
    CREATE TABLE orders_v5 (
      id                 INTEGER PRIMARY KEY,
      code               TEXT NOT NULL UNIQUE,
      type               TEXT NOT NULL CHECK (type IN ('menu', 'cake')),
      status             TEXT NOT NULL DEFAULT 'new'
                         CHECK (status IN ('new', 'confirmed', 'baking', 'ready', 'completed', 'cancelled')),
      customer_name      TEXT NOT NULL,
      customer_phone     TEXT NOT NULL,
      customer_email     TEXT NOT NULL DEFAULT '',
      pickup_date        TEXT NOT NULL,
      pickup_time        TEXT NOT NULL,
      notes              TEXT NOT NULL DEFAULT '',
      total_cents        INTEGER NOT NULL,
      created_at         TEXT NOT NULL DEFAULT (datetime('now')),
      fulfillment        TEXT NOT NULL DEFAULT 'pickup',
      delivery_address   TEXT NOT NULL DEFAULT '',
      delivery_fee_cents INTEGER NOT NULL DEFAULT 0,
      branch             TEXT NOT NULL DEFAULT '',
      reference_image    TEXT NOT NULL DEFAULT ''
    );
    INSERT INTO orders_v5 (
      id, code, type, status, customer_name, customer_phone, customer_email,
      pickup_date, pickup_time, notes, total_cents, created_at,
      fulfillment, delivery_address, delivery_fee_cents, branch, reference_image
    )
    SELECT
      id, code, type, status, customer_name, customer_phone, customer_email,
      pickup_date, pickup_time, notes, total_cents, created_at,
      fulfillment, delivery_address, delivery_fee_cents, branch, reference_image
    FROM orders;
    DROP TABLE orders;
    ALTER TABLE orders_v5 RENAME TO orders;
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);
  `);
}

// Version 4: branches (customers pick one; each has its own WhatsApp) and inspiration photos on orders.
function migrateToVersion4() {
  db.exec(`
    CREATE TABLE branches (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      address    TEXT NOT NULL DEFAULT '',
      phone      TEXT NOT NULL DEFAULT '',
      whatsapp   TEXT NOT NULL DEFAULT '',
      maps_link  TEXT NOT NULL DEFAULT '',
      available  INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    ALTER TABLE orders ADD COLUMN branch TEXT NOT NULL DEFAULT '';
    ALTER TABLE orders ADD COLUMN reference_image TEXT NOT NULL DEFAULT '';
  `);
  // The two shops, from Savory's Instagram (Aley) and Facebook / Google Maps (Aramoun) listings.
  const add = db.prepare('INSERT INTO branches (name, address, phone, whatsapp, maps_link, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
  add.run('Aley', 'Aley, Mount Lebanon', '70 548 208', '+961 70 548 208', '', 0);
  add.run('Aramoun', 'Aramoun, Aley, Mount Lebanon', '05 411 405', '+961 79 167 464', 'https://maps.google.com/?cid=4880834083851702817', 1);
}

// Version 3: bigger cakes cost more to decorate and need more notice.
//   price_scale (sizes): multiplies the extra charge of every add-on that scales with size
//   scales (other choices): 1 = its price grows with the cake size, 0 = fixed price (candles, toppers…)
//   lead_days (sizes): extra days of notice on top of the shop-wide minimum
function migrateToVersion3() {
  db.exec(`
    ALTER TABLE cake_options ADD COLUMN price_scale REAL NOT NULL DEFAULT 1;
    ALTER TABLE cake_options ADD COLUMN scales INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE cake_options ADD COLUMN lead_days INTEGER NOT NULL DEFAULT 0;
    UPDATE cake_options SET scales = 0 WHERE type = 'extras';
  `);

  // Starting point: add-ons scale with the size's price (a size that costs twice as much
  // makes twice as much cake to cover), and the largest size needs one extra day.
  const sizes = db.prepare("SELECT id, price_cents FROM cake_options WHERE type = 'size' ORDER BY price_cents, sort_order").all();
  const smallest = sizes.find((s) => s.price_cents > 0)?.price_cents;
  if (smallest) {
    const update = db.prepare('UPDATE cake_options SET price_scale = ? WHERE id = ?');
    for (const s of sizes) update.run(Math.max(1, Math.round((s.price_cents / smallest) * 4) / 4), s.id);
  }
  if (sizes.length >= 3) db.prepare('UPDATE cake_options SET lead_days = 1 WHERE id = ?').run(sizes[sizes.length - 1].id);
}

// Version 2: richer cake builder, menu add-ons, delivery, gallery, reviews, FAQ, contact messages.
function migrateToVersion2() {
  // cake_options: drop the fixed type list (validated in code now) and add color + visual.
  db.exec(`
    CREATE TABLE cake_options_v2 (
      id          INTEGER PRIMARY KEY,
      type        TEXT NOT NULL,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price_cents INTEGER NOT NULL DEFAULT 0,
      color       TEXT NOT NULL DEFAULT '',
      visual      TEXT NOT NULL DEFAULT '',
      available   INTEGER NOT NULL DEFAULT 1,
      sort_order  INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO cake_options_v2 (id, type, name, description, price_cents, available, sort_order)
      SELECT id, type, name, description, price_cents, available, sort_order FROM cake_options;
    DROP TABLE cake_options;
    ALTER TABLE cake_options_v2 RENAME TO cake_options;

    -- Per-item choices, e.g. [{"name":"Size","type":"single","required":true,"choices":[{"name":"Large","price_cents":100}]}]
    ALTER TABLE menu_items ADD COLUMN options TEXT NOT NULL DEFAULT '[]';

    ALTER TABLE orders ADD COLUMN fulfillment TEXT NOT NULL DEFAULT 'pickup';
    ALTER TABLE orders ADD COLUMN delivery_address TEXT NOT NULL DEFAULT '';
    ALTER TABLE orders ADD COLUMN delivery_fee_cents INTEGER NOT NULL DEFAULT 0;

    CREATE TABLE gallery_images (
      id         INTEGER PRIMARY KEY,
      image      TEXT NOT NULL,
      caption    TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE reviews (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      text       TEXT NOT NULL,
      rating     INTEGER NOT NULL DEFAULT 5,
      available  INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE faqs (
      id         INTEGER PRIMARY KEY,
      question   TEXT NOT NULL,
      answer     TEXT NOT NULL,
      available  INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE messages (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL DEFAULT '',
      phone      TEXT NOT NULL DEFAULT '',
      message    TEXT NOT NULL,
      is_read    INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const insertOption = db.prepare(`
    INSERT INTO cake_options (type, name, description, price_cents, color, visual, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const groupCount = db.prepare('SELECT COUNT(*) AS n FROM cake_options WHERE type = ?');
  for (const [type, rows] of Object.entries(CAKE_SEEDS)) {
    if (groupCount.get(type).n > 0) continue;
    rows.forEach(([name, desc, price, color, visual], i) => insertOption.run(type, name, desc, price, color, visual, i));
  }

  // Example add-ons on the sample items, if they're still there.
  const addOptions = db.prepare("UPDATE menu_items SET options = ? WHERE name = ? AND options = '[]'");
  addOptions.run(JSON.stringify([
    { name: 'Size', type: 'single', required: true, choices: [{ name: 'Regular', price_cents: 0 }, { name: 'Large', price_cents: 100 }] },
    { name: 'Extras', type: 'multi', required: false, choices: [{ name: 'Whipped cream', price_cents: 50 }, { name: 'Marshmallows', price_cents: 50 }] },
  ]), 'Hot chocolate');
  addOptions.run(JSON.stringify([
    { name: 'Serve it with', type: 'single', required: false, choices: [{ name: 'Vanilla ice cream', price_cents: 200 }, { name: 'Whipped cream', price_cents: 100 }] },
  ]), 'Chocolate fudge slice');

  const faq = db.prepare('INSERT INTO faqs (question, answer, sort_order) VALUES (?, ?, ?)');
  [
    ['How far ahead should I order a custom cake?', 'Custom cakes need a few days\' notice. The cake builder shows the earliest date you can choose. For large or tiered cakes, earlier is always better.'],
    ['How do I pay?', 'You pay when you collect your order, or when it\'s delivered. There\'s nothing to pay online.'],
    ['Do you deliver?', 'Yes, within our delivery area. Choose "Delivery" at checkout to see the fee.'],
    ['Can you cater for allergies or dietary needs?', 'We offer vegan, gluten-free, nut-free and eggless options in the cake builder. Our kitchen handles nuts, gluten, dairy and eggs, so we can\'t guarantee a cake is completely allergen-free. Please tell us about any allergies in the notes.'],
    ['Can I change or cancel my order?', 'Please call us as soon as possible with your order number and we\'ll do our best to help.'],
    ['Can you recreate a design from a photo?', 'Often, yes! Describe it in the design notes when you order, or send us a message through the Contact page.'],
  ].forEach(([q, a], i) => faq.run(q, a, i));
}

function seedVersion1() {
  const opt = db.prepare('INSERT INTO cake_options (type, name, description, price_cents, sort_order) VALUES (?, ?, ?, ?, ?)');
  const options = [
    ['size', '6" round', 'Serves 8–10', 4500],
    ['size', '8" round', 'Serves 12–16', 6000],
    ['size', '10" round', 'Serves 20–25', 8500],
    ['flavor', 'Dark chocolate', 'Rich cocoa sponge', 0],
    ['flavor', 'Vanilla bean', 'Classic and light', 0],
    ['flavor', 'Red velvet', '', 500],
    ['filling', 'No filling', '', 0],
    ['filling', 'Chocolate ganache', '', 500],
    ['filling', 'Salted caramel', '', 600],
    ['filling', 'Fresh strawberry', '', 700],
    ['frosting', 'Chocolate buttercream', '', 0],
    ['frosting', 'Vanilla buttercream', '', 0],
    ['frosting', 'Cream cheese', '', 400],
  ];
  options.forEach(([type, name, desc, price], i) => opt.run(type, name, desc, price, i));

  const item = db.prepare('INSERT INTO menu_items (name, description, category, price_cents, sort_order) VALUES (?, ?, ?, ?, ?)');
  const items = [
    ['Chocolate fudge slice', 'A thick slice of our house chocolate cake.', 'Cakes by the slice', 550],
    ['Carrot cake slice', 'Spiced carrot cake with cream cheese frosting.', 'Cakes by the slice', 500],
    ['Brownie', 'Dense, fudgy and dark.', 'Bakes', 350],
    ['Chocolate chip cookie', 'Crisp edges, soft middle.', 'Bakes', 250],
    ['Hot chocolate', 'Made with melted dark chocolate and steamed milk.', 'Drinks', 450],
  ];
  items.forEach(([name, desc, cat, price], i) => item.run(name, desc, cat, price, i));
}

// ---------- Settings ----------

// Defaults describe the real shop (from its public Facebook and Google Maps listings).
// Everything here can be changed in Admin → Settings.
export const DEFAULT_SETTINGS = {
  shop_name: 'SAVORY',
  hero_title: 'Cakes as beautiful as your moments',
  slogan: 'Where every bite is a Savory moment',
  tagline: 'Chocolates, cakes and ice cream, made in Aramoun, Aley.',
  about: 'SAVORY is a chocolate and sweets maker in Aramoun, Aley. We make chocolates, cakes, éclairs and ice cream, carry a wide selection of mixed nuts, and prepare chocolate favors for weddings and new arrivals.',
  about_story: 'SAVORY is a chocolate and sweets maker in Aramoun, in the Aley district of Mount Lebanon.\n\nWe make chocolates, ice cream, éclairs and cakes, from classic gateaux to custom designs. Tell us your idea, or leave the design to our chef.\n\nFor weddings, baby showers and every kind of celebration we prepare wrapped chocolate favors, and during Ramadan and Eid you\'ll find Arabic sweets alongside our chocolates.\n\nCome and visit us in Aramoun, or send us a message on WhatsApp.',
  phone: '05 411 405',
  whatsapp: '+961 79 167 464',
  email: 'info@savory-chocolate.com',
  address: 'Aramoun, Aley\nMount Lebanon, Lebanon',
  maps_link: 'https://maps.google.com/?cid=4880834083851702817',
  hours: 'Call or WhatsApp us for today\'s opening hours.',
  instagram: 'https://www.instagram.com/savory.chocolate/',
  facebook: 'https://www.facebook.com/SavoryChocolate/',
  currency: 'USD',
  cake_lead_days: '2',
  orders_open: '1',
  promo_codes: 'SAVORY10:10, EID15:15',
  delivery_enabled: '1',
  delivery_fee: '500',
  delivery_min: '0',
  delivery_area: 'Delivery is available in our local area. Message us on WhatsApp to check yours.',
};

for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function getSettings() {
  db.prepare("UPDATE settings SET value = 'SAVORY' WHERE key = 'shop_name' AND value = 'Savory Chocolate'").run();
  db.prepare("UPDATE settings SET value = ? WHERE key = 'about' AND value LIKE 'Savory Chocolate is a chocolate%'").run(DEFAULT_SETTINGS.about);
  db.prepare("UPDATE settings SET value = ? WHERE key = 'about_story' AND value LIKE 'Savory Chocolate is a chocolate%'").run(DEFAULT_SETTINGS.about_story);
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
