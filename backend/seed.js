const pool = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_SEED_PASSWORD || '';
  if (password.length < 12 || password.length > 1024) throw new Error('DEMO_PASSWORD must contain 12-1024 characters');
  return password;
}

async function seed() {
  console.log('Seeding rental marketplace database...');

  await pool.query(`
    DROP TABLE IF EXISTS maintenance_schedules, service_request_updates, service_requests, service_contracts, subscription_plans, notifications, messages, favorites, reviews, bookings, listings, users CASCADE;

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE listings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100) NOT NULL,
      subcategory VARCHAR(100),
      price_per_day DECIMAL(10,2) NOT NULL,
      price_per_week DECIMAL(10,2),
      price_per_month DECIMAL(10,2),
      location VARCHAR(255),
      city VARCHAR(100),
      item_condition VARCHAR(50) DEFAULT 'Good',
      features TEXT,
      rules TEXT,
      image_url TEXT,
      availability_status VARCHAR(20) DEFAULT 'available',
      rating DECIMAL(2,1) DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE bookings (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
      renter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      message TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE reviews (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
      reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, listing_id)
    );

    CREATE TABLE messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
      content TEXT NOT NULL,
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      link VARCHAR(255),
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE subscription_plans (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
      owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      plan_name VARCHAR(100) NOT NULL,
      monthly_price DECIMAL(10,2) NOT NULL,
      includes_maintenance BOOLEAN DEFAULT false,
      includes_repair BOOLEAN DEFAULT false,
      includes_parts BOOLEAN DEFAULT false,
      includes_inspection BOOLEAN DEFAULT false,
      includes_priority_support BOOLEAN DEFAULT false,
      max_service_requests INTEGER DEFAULT 5,
      response_time_hours INTEGER DEFAULT 48,
      contract_duration_months INTEGER DEFAULT 3,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE service_contracts (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
      plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL,
      listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
      renter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      plan_name VARCHAR(100) NOT NULL,
      monthly_price DECIMAL(10,2) NOT NULL,
      includes_maintenance BOOLEAN DEFAULT false,
      includes_repair BOOLEAN DEFAULT false,
      includes_parts BOOLEAN DEFAULT false,
      includes_inspection BOOLEAN DEFAULT false,
      includes_priority_support BOOLEAN DEFAULT false,
      max_service_requests INTEGER DEFAULT 5,
      response_time_hours INTEGER DEFAULT 48,
      contract_duration_months INTEGER DEFAULT 3,
      status VARCHAR(20) DEFAULT 'active',
      auto_renew BOOLEAN DEFAULT false,
      terms TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE service_requests (
      id SERIAL PRIMARY KEY,
      contract_id INTEGER REFERENCES service_contracts(id) ON DELETE CASCADE,
      listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
      renter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'open',
      title VARCHAR(255) NOT NULL,
      description TEXT,
      estimated_cost DECIMAL(10,2),
      actual_cost DECIMAL(10,2),
      opened_at TIMESTAMP DEFAULT NOW(),
      assigned_at TIMESTAMP,
      resolved_at TIMESTAMP,
      closed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE service_request_updates (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      comment TEXT NOT NULL,
      new_status VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE maintenance_schedules (
      id SERIAL PRIMARY KEY,
      contract_id INTEGER REFERENCES service_contracts(id) ON DELETE CASCADE,
      listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
      owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      frequency VARCHAR(20) NOT NULL,
      next_due_date DATE NOT NULL,
      last_completed_date DATE,
      status VARCHAR(20) DEFAULT 'scheduled',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Tables created.');

  // Users
  const pw = await bcrypt.hash(requireDemoPassword(), 10);
  await pool.query(`INSERT INTO users (email, password, name, phone) VALUES
    ('demo@rental.com', $1, 'Demo User', '555-0100'),
    ('alice@rental.com', $1, 'Alice Johnson', '555-0101'),
    ('bob@rental.com', $1, 'Bob Martinez', '555-0102'),
    ('carol@rental.com', $1, 'Carol Williams', '555-0103'),
    ('dave@rental.com', $1, 'Dave Chen', '555-0104')
  `, [pw]);
  console.log('Users created.');

  // Helper to cycle user_ids 1-5 (includes demo user so they have listings)
  const uid = (i) => (i % 5) + 1;

  // ===================== PROPERTIES (16) =====================
  const properties = [
    ['Modern Downtown Loft', 'Stylish open-plan loft in the heart of downtown. Floor-to-ceiling windows with city views, fully equipped kitchen, high-speed WiFi, smart TV. Walking distance to restaurants and transit.', 'Apartment', 150, 900, 3200, '123 Main St, Apt 4B', 'New York', 'Excellent', 'WiFi, Smart TV, Full Kitchen, Washer/Dryer, City View, Gym Access, Doorman', 'No smoking, No parties, Max 4 guests, Quiet hours 10pm-8am'],
    ['Cozy Beach House', 'Charming 3-bedroom beach house just 200 feet from the shore. Wrap-around deck with ocean views, outdoor shower, BBQ grill, and private parking. Beach gear included.', 'House', 250, 1500, 5000, '45 Ocean Drive', 'Malibu', 'Good', 'Ocean View, BBQ, Deck, Beach Gear, Parking, 3 Bedrooms, 2 Bathrooms', 'No pets, No smoking, Check-in after 3pm, Check-out by 11am'],
    ['Mountain Cabin Retreat', 'Rustic yet modern cabin nestled in the mountains. Wood-burning fireplace, hot tub on the deck, hiking trails from the doorstep. Two bedrooms and a game room.', 'Cabin', 180, 1100, 3800, '789 Pine Ridge Road', 'Aspen', 'Excellent', 'Hot Tub, Fireplace, Game Room, Mountain Views, Hiking Access, WiFi', 'No smoking indoors, Firewood provided, Pets with approval'],
    ['Luxury Penthouse Suite', 'Stunning 2-bedroom penthouse with panoramic skyline views. Rooftop access, concierge service, marble bathrooms, and designer furnishings throughout.', 'Penthouse', 350, 2200, 7500, '500 Park Avenue, PH1', 'New York', 'Excellent', 'Rooftop Terrace, Concierge, Marble Bath, King Beds, Wine Fridge, 70in TV', 'No parties, No smoking, Max 4 guests, Premium linens provided'],
    ['Lakefront Cottage', 'Peaceful cottage right on the lake with private dock and canoe. Screened porch, wood stove, and full kitchen. Perfect for fishing and relaxation.', 'Cottage', 120, 720, 2400, '88 Lakeshore Lane', 'Lake Tahoe', 'Good', 'Private Dock, Canoe, Screened Porch, Wood Stove, Full Kitchen, Fishing Gear', 'No motorboats, Life jackets provided, Quiet after 9pm'],
    ['Urban Studio Apartment', 'Sleek studio in trendy neighborhood. Murphy bed, kitchenette, great natural light. Steps from cafes, galleries, and nightlife. Ideal for solo travelers.', 'Studio', 85, 500, 1600, '220 Arts District Blvd', 'Los Angeles', 'Good', 'Murphy Bed, Kitchenette, WiFi, Smart TV, Washer, Walk Score 95', 'No smoking, No pets, Max 2 guests'],
    ['Desert Adobe Villa', 'Stunning adobe-style villa with pool and mountain views. Three bedrooms, outdoor fire pit, and stargazing telescope. Southwest charm meets modern comfort.', 'Villa', 275, 1700, 5800, '15 Coyote Trail', 'Scottsdale', 'Excellent', 'Private Pool, Fire Pit, Telescope, Mountain Views, 3 Bedrooms, Full Kitchen', 'Pool use at own risk, No glass near pool, Pets allowed with deposit'],
    ['Historic Brownstone Floor', 'Entire floor of a beautifully restored 1890s brownstone. Original hardwood floors, crown molding, modern kitchen, and private garden access.', 'Brownstone', 195, 1200, 4200, '34 Beacon Hill', 'Boston', 'Excellent', 'Garden Access, Hardwood Floors, Crown Molding, Dishwasher, 2 Bedrooms', 'No smoking, Respect quiet hours, Historic building rules apply'],
    ['Treehouse Glamping Experience', 'Unique treehouse 20 feet up in an old-growth oak. Queen bed, composting toilet, outdoor rain shower, and wrap-around deck with forest views.', 'Treehouse', 160, 950, null, '1 Canopy Road', 'Asheville', 'Good', 'Queen Bed, Outdoor Shower, Wrap Deck, Solar Lights, Breakfast Basket', 'Adults only, Max 2 guests, No loud music, Pack out trash'],
    ['Converted Warehouse Loft', 'Massive 1800sqft industrial loft with exposed brick, 16-foot ceilings, and original factory windows. Chef kitchen, media room, and rooftop access.', 'Loft', 200, 1250, 4500, '77 Factory Row', 'Brooklyn', 'Excellent', 'Exposed Brick, 16ft Ceilings, Chef Kitchen, Media Room, Rooftop, Parking', 'No smoking, No events without approval, Building has freight elevator'],
    ['Oceanfront Condo', 'Wake up to waves crashing right below your balcony. 2BR/2BA condo with ocean-facing master, pool access, and underground parking.', 'Condo', 190, 1150, 3900, '900 Coast Highway, Unit 12', 'San Diego', 'Excellent', 'Ocean View, Balcony, Pool, Parking, 2BR/2BA, Fully Equipped Kitchen', 'No smoking, No pets, Check-in 4pm, Beach towels provided'],
    ['Tiny House on Wheels', 'Instagram-worthy tiny house with loft bedroom, full kitchen, and oversized windows. Parked on a private ranch with hill country views.', 'Tiny House', 95, 580, 1900, '400 Ranch Road', 'Austin', 'Good', 'Loft Bed, Full Kitchen, Hot Water, AC, Ranch Views, Fire Pit, Parking', 'Max 2 guests, No pets, Generator powered after dark'],
    ['Ski-In Ski-Out Chalet', 'True ski-in ski-out access on the main run. 4 bedrooms, boot warmers, private hot tub, and après-ski bar. Sleeps 10 comfortably.', 'Chalet', 450, 2800, 9500, '1 Powder Lane', 'Park City', 'Excellent', 'Ski Access, Hot Tub, Boot Warmers, Bar, 4 Bedrooms, Sleeps 10, Fireplace', 'No shoes on hardwood, Boot room provided, Ski storage included'],
    ['Riverside Yurt', 'Handcrafted Mongolian yurt on the banks of a gentle river. Wood-burning stove, queen platform bed, and outdoor kitchen. Off-grid serenity.', 'Yurt', 110, 650, null, '55 River Bend', 'Bend', 'Good', 'Wood Stove, Queen Bed, Outdoor Kitchen, River Access, Fire Pit, Stargazing', 'No electronics charging, Bring flashlight, Composting toilet'],
    ['Midtown Corporate Suite', 'Professionally furnished 1BR suite designed for business travelers. Dedicated workspace, printer access, meeting room, and 24/7 gym.', 'Suite', 165, 1000, 3500, '350 Midtown Blvd, Suite 8C', 'Atlanta', 'Excellent', 'Workspace, Printer, Meeting Room, Gym, WiFi 500Mbps, Coffee Machine', 'Business use welcome, No smoking, No parties, Laundry on-site'],
    ['Tropical Garden Bungalow', 'Private bungalow surrounded by tropical gardens with outdoor shower and hammock. Steps from a secluded beach. Island vibes with modern amenities.', 'Bungalow', 135, 820, 2800, '12 Palm Way', 'Key West', 'Good', 'Outdoor Shower, Hammock, Garden, Beach Access, AC, Kitchenette, Bikes', 'No smoking indoors, Bikes must be locked, Respect garden plants'],
  ];

  for (let i = 0; i < properties.length; i++) {
    const p = properties[i];
    await pool.query(
      `INSERT INTO listings (user_id, title, description, category, subcategory, price_per_day, price_per_week, price_per_month, location, city, item_condition, features, rules, views)
       VALUES ($1,$2,$3,'Properties',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [uid(i), p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], Math.floor(Math.random() * 500) + 50]
    );
  }
  console.log(`  ${properties.length} Properties seeded.`);

  // ===================== VEHICLES (16) =====================
  const vehicles = [
    ['Tesla Model 3 Long Range', '2023 Tesla Model 3 with autopilot, premium interior, and 358-mile range. Supercharger network access included. Perfect for road trips.', 'Electric Car', 89, 550, 1800, 'Downtown Garage, Level 2', 'San Francisco', 'Excellent', 'Autopilot, Premium Audio, Heated Seats, 358mi Range, Supercharger Access', 'Must be 25+, Valid license, No smoking, Return with 80% charge'],
    ['Vintage VW Camper Van', '1972 VW Type 2 restored to perfection. Pop-top roof, kitchenette, sleeps 2. A head-turner everywhere. Perfect for coastal road trips.', 'Camper Van', 120, 750, 2500, '100 Surf Boulevard', 'Santa Cruz', 'Good', 'Pop-top Roof, Kitchenette, Bluetooth Speaker, Camping Gear, Cooler', '200 miles/day included, Must be 21+, No off-road driving'],
    ['Harley Davidson Sportster', '2022 Harley Sportster S. 1250cc Revolution Max engine. All gear included: helmet, jacket, saddlebags. Feel the freedom.', 'Motorcycle', 75, 450, 1500, '55 Motor Ave', 'Austin', 'Excellent', 'Full Gear Included, GPS, Saddlebags, 1250cc Engine, ABS Brakes', 'Motorcycle license required, Must be 25+, 150 miles/day included'],
    ['BMW X5 SUV', '2024 BMW X5 xDrive40i with third-row seating. Panoramic sunroof, heated leather seats, premium Harman Kardon sound. Great for family trips.', 'SUV', 110, 680, 2200, '800 Luxury Motors Blvd', 'Chicago', 'Excellent', 'AWD, Panoramic Sunroof, Heated Seats, Third Row, Apple CarPlay, 360 Camera', 'Must be 25+, Valid license, 200 mi/day included, No smoking'],
    ['Ford Transit Cargo Van', '2023 Ford Transit 250 High Roof cargo van. Perfect for moving, deliveries, or hauling equipment. Comes with moving blankets and dolly.', 'Cargo Van', 65, 380, 1200, '450 Industrial Pkwy', 'Portland', 'Good', 'High Roof, Moving Blankets, Dolly, GPS, Backup Camera, 250cu ft Cargo', 'Must be 21+, Valid license, Return with full tank, Report damage'],
    ['Porsche 911 Carrera', '2023 Porsche 911 Carrera S. 443hp twin-turbo flat-six. PDK transmission, sport exhaust, and premium interior. The ultimate driving experience.', 'Sports Car', 250, 1500, null, '1 Exotic Auto Club', 'Miami', 'Excellent', '443hp, PDK, Sport Exhaust, Premium Interior, Sport Chrono, Bose Sound', 'Must be 30+, $5000 security deposit, 100 mi/day, No track use'],
    ['Toyota Tacoma 4x4', '2023 Tacoma TRD Off-Road with bed tent, roof rack, and recovery gear. Ready for any trail or campsite. Includes camping setup.', 'Truck', 85, 520, 1700, '33 Trailhead Parking', 'Moab', 'Good', 'TRD Off-Road, Bed Tent, Roof Rack, Recovery Gear, Camping Table, Cooler', 'Must be 25+, Off-road allowed on designated trails, Return cleaned'],
    ['Mercedes Sprinter RV', '2022 Mercedes Sprinter converted camper van. Full bathroom, queen bed, kitchen with fridge, solar power, and 4G WiFi. Home on wheels.', 'RV', 175, 1050, 3500, '200 Van Life Way', 'Denver', 'Excellent', 'Full Bathroom, Queen Bed, Kitchen, Solar, 4G WiFi, Fridge, Outdoor Shower', 'Must be 25+, No smoking, Dump station use required, 200 mi/day'],
    ['Vespa Primavera 150', 'Classic Italian Vespa Primavera 150cc. Perfect for city exploring and coastal rides. Helmet and lock included. Gets 80+ mpg.', 'Scooter', 35, 200, 650, '15 Little Italy Lane', 'San Francisco', 'Good', '150cc, Helmet Included, Lock, USB Charger, Under-seat Storage, 80mpg', 'Valid license required, Must be 21+, City riding only'],
    ['Jeep Wrangler Rubicon', '2024 Jeep Wrangler Rubicon 4-door with removable top and doors. Lifted with 35-inch tires. Ultimate off-road machine.', 'Off-Road', 95, 580, 1900, '77 Adventure Rentals', 'Sedona', 'Excellent', 'Rubicon, Removable Top, Lifted, 35in Tires, Winch, Rock Rails, CB Radio', 'Must be 25+, Off-road experience preferred, 150 mi/day included'],
    ['Luxury Party Bus', '30-passenger party bus with LED lighting, premium sound system, two flat screens, wet bar, and dance pole. Professional driver included.', 'Party Bus', 300, null, null, '500 Entertainment Blvd', 'Las Vegas', 'Excellent', '30 Passengers, LED Lighting, Sound System, Wet Bar, TVs, Driver Included', 'Must be 21+, No outside alcohol, 4-hour minimum, Gratuity not included'],
    ['Cadillac Escalade', '2024 Cadillac Escalade Premium Luxury. Magnetic ride suspension, 36-speaker AKG audio, Super Cruise hands-free driving. Seats 7 in luxury.', 'Luxury SUV', 145, 900, 3000, '1200 VIP Transport Way', 'Los Angeles', 'Excellent', 'Super Cruise, 36-Speaker AKG, Magnetic Ride, Seats 7, Night Vision', 'Must be 25+, No smoking, 200 mi/day, Premium fuel only'],
    ['Electric Bike Pair', 'Two RadPower RadCity 5 Plus e-bikes with panniers, locks, and helmets. 50+ mile range each. Perfect for exploring the city together.', 'E-Bike', 30, 175, 500, '45 Bike Share Hub', 'Portland', 'Good', '2 E-Bikes, 50mi Range, Panniers, Locks, Helmets, Phone Mounts, Lights', 'Helmet required, Follow traffic laws, Return charged, Report damage'],
    ['Pontoon Boat 22ft', '22-foot Bennington pontoon boat with 115hp outboard. Bimini top, Bluetooth stereo, fish finder, and cooler. Licensed for 10 passengers.', 'Boat', 200, 1200, null, 'Marina Slip 14', 'Lake Travis', 'Good', '22ft, 115hp, Bimini Top, Bluetooth, Fish Finder, Cooler, 10 Passengers', 'Boating license required, Life jackets provided, No wake zones enforced'],
    ['Airstream Basecamp 20X', '2023 Airstream Basecamp 20X travel trailer. Sleeps 2, full bathroom, kitchen, A/C, and all-terrain package. Ready for highway hookup.', 'Travel Trailer', 95, 580, 1900, '88 RV Storage Lot', 'Phoenix', 'Excellent', 'Sleeps 2, Full Bath, Kitchen, AC, All-Terrain, Solar Prep, Awning', 'Must have tow vehicle rated 3500lb+, Return holding tanks empty'],
    ['Classic Ford Mustang Convertible', '1967 Ford Mustang convertible in cherry red. 289 V8, automatic, power top. Pure American muscle for a memorable weekend cruise.', 'Classic Car', 175, 1050, null, '66 Route Heritage', 'Nashville', 'Good', '289 V8, Convertible, Automatic, AM/FM, Power Top, Chrome Wheels', 'Must be 25+, No highway racing, 100 mi/day, Premium fuel, Garage storage'],
  ];

  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    await pool.query(
      `INSERT INTO listings (user_id, title, description, category, subcategory, price_per_day, price_per_week, price_per_month, location, city, item_condition, features, rules, views)
       VALUES ($1,$2,$3,'Vehicles',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [uid(i), v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10], Math.floor(Math.random() * 500) + 50]
    );
  }
  console.log(`  ${vehicles.length} Vehicles seeded.`);

  // ===================== ELECTRONICS (16) =====================
  const electronics = [
    ['Sony A7 IV Camera Kit', 'Professional Sony A7 IV with 28-70mm f/2.8 and 50mm f/1.8 lenses, extra batteries, 128GB cards, and carrying case. 33MP full-frame sensor.', 'Camera', 65, 380, 1200, '200 Tech Plaza', 'Los Angeles', 'Excellent', 'Full Frame 33MP, 2 Lenses, Extra Batteries, 128GB Storage, Carrying Case, Tripod', 'ID required as deposit, Handle with care, Return cleaned'],
    ['MacBook Pro 16" M3 Max', 'MacBook Pro 16-inch with M3 Max, 36GB RAM, 1TB SSD. Creative Suite pre-installed. Charger and USB-C hub included.', 'Laptop', 55, 320, 1000, '85 Innovation Blvd', 'San Francisco', 'Excellent', 'M3 Max, 36GB RAM, 1TB SSD, Creative Suite, USB-C Hub, 22hr Battery', 'Do not install software, Return in case, No food near device'],
    ['DJI Mavic 3 Pro Drone', 'DJI Mavic 3 Pro with Hasselblad camera, 43-min flight time. 3 batteries, ND filter set, carrying case, spare propellers. FAA registered.', 'Drone', 85, 500, 1600, '300 Sky Park Drive', 'Denver', 'Excellent', 'Hasselblad Camera, 4K/120fps, 3 Batteries, ND Filters, 43min Flight, FAA Registered', 'Must follow FAA rules, No indoor flying, Return all accessories'],
    ['Canon EOS R5 Cinema Kit', 'Canon EOS R5 with 24-70mm f/2.8L, 70-200mm f/2.8L, Atomos Ninja V recorder, follow focus, matte box, and Pelican case. 8K cinema ready.', 'Cinema Camera', 150, 900, 3000, '10 Filmmakers Row', 'Los Angeles', 'Excellent', '8K Video, 2 L-Series Lenses, Atomos Ninja V, Follow Focus, Matte Box, Pelican Case', 'Professional use only, Insurance required, Return all items in case'],
    ['iPad Pro 12.9" with Apple Pencil', 'iPad Pro M2 12.9-inch with Apple Pencil, Magic Keyboard, and Procreate pre-installed. 256GB. Perfect for digital art and presentations.', 'Tablet', 25, 150, 450, '50 Creative Hub', 'Austin', 'Excellent', 'M2 Chip, 12.9in, Apple Pencil, Magic Keyboard, Procreate, 256GB', 'Return in case, Do not reset, No screen protector removal'],
    ['Sony PS5 + VR2 Bundle', 'PlayStation 5 with PS VR2 headset, 4 controllers, 12 games including Gran Turismo 7 VR, Horizon, and Astro Bot. All cables included.', 'Gaming Console', 35, 200, 600, '88 Game Zone', 'Seattle', 'Excellent', 'PS5, PS VR2, 4 Controllers, 12 Games, All Cables, Carrying Bag', 'Handle VR with care, Return all discs, No food near console'],
    ['Rode Podcaster Pro Studio', 'Complete podcasting setup: RodeCaster Pro II, 2x Rode PodMic, boom arms, headphones, pop filters, and acoustic panels. Record and stream ready.', 'Audio Equipment', 45, 260, 800, '12 Podcast Lane', 'Nashville', 'Excellent', 'RodeCaster Pro II, 2 PodMics, Boom Arms, Headphones, Pop Filters, Acoustic Panels', 'Handle with care, Return all accessories, No permanent mounting'],
    ['Projector 4K Home Cinema', 'Epson 4K PRO-UHD projector with 100-inch motorized screen, 5.1 surround speakers, Apple TV 4K, and all cables. Instant movie theater.', 'Projector', 55, 320, 1000, '40 Cinema Supplies', 'Chicago', 'Good', '4K Projector, 100in Screen, 5.1 Surround, Apple TV, All Cables, Remote', 'Indoor use only, Handle screen carefully, Return in provided cases'],
    ['GoPro HERO12 Adventure Kit', '3x GoPro HERO12 cameras with chest mount, head strap, suction cup, selfie stick, 3 extra batteries, and waterproof cases. Action-ready.', 'Action Camera', 40, 230, 700, '5 Extreme Sports Depot', 'San Diego', 'Good', '3 GoPro HERO12, Chest Mount, Head Strap, Suction Cup, Selfie Stick, Waterproof Cases', 'Return all mounts, Rinse after saltwater, Check for sand in housing'],
    ['Dell Gaming PC + Monitor', 'Dell Alienware Aurora R16 with RTX 4080, i9-14900K, 32GB RAM, 2TB SSD. 34-inch ultrawide monitor, mechanical keyboard, gaming mouse.', 'Desktop PC', 60, 350, 1100, '99 Gaming Center', 'Dallas', 'Excellent', 'RTX 4080, i9-14900K, 32GB RAM, 2TB SSD, 34in Ultrawide, Keyboard, Mouse', 'Do not open case, No food near equipment, Return all peripherals'],
    ['Portable PA System', 'JBL EON ONE MK2 portable PA with wireless microphone, speaker stand, and carrying case. Battery-powered, Bluetooth. 1500W peak.', 'PA System', 50, 290, 900, '300 Sound Avenue', 'Atlanta', 'Good', 'JBL EON ONE MK2, Wireless Mic, Stand, Battery Powered, Bluetooth, 1500W', 'Indoor or outdoor, Handle with care, Return in carrying case'],
    ['Starlink Internet Kit', 'Starlink satellite internet kit with dish, router, and tripod mount. Get high-speed internet anywhere - camping, events, or remote locations.', 'Internet Equipment', 20, 120, 350, '1 Satellite Way', 'Denver', 'Excellent', 'Starlink Dish, Router, Tripod, 100ft Cable, 50-200Mbps, Portable', 'Clear sky view required, Return all components, Handle dish carefully'],
    ['Samsung Galaxy S24 Ultra', 'Samsung Galaxy S24 Ultra with 200MP camera, S Pen, 5G. Unlocked and ready for any carrier. Perfect backup phone or for travel.', 'Smartphone', 15, 85, 250, '200 Mobile Hub', 'Houston', 'Excellent', '200MP Camera, S Pen, 5G Unlocked, 512GB, Titanium Frame, Case Included', 'Return factory reset, Include charger, Report damage immediately'],
    ['DJI Osmo Pocket 3', 'DJI Osmo Pocket 3 Creator Combo with 1-inch CMOS sensor, rotating screen, wireless mic, and mini tripod. Cinematic handheld footage.', 'Gimbal Camera', 25, 145, 430, '15 Creator Studio', 'Portland', 'Excellent', '1-inch CMOS, 4K/120fps, Wireless Mic, Rotating Screen, Mini Tripod, 128GB', 'Handle with care, Return in case, Check for firmware updates'],
    ['Raspberry Pi Cluster (8 units)', 'Cluster of 8 Raspberry Pi 5 units in a rack with networking switch, power supply, and NVMe drives. Pre-configured for distributed computing.', 'Computing', 30, 175, 550, '777 Maker Space', 'San Jose', 'Good', '8x Pi 5, Rack, Switch, Power Supply, NVMe Drives, Pre-configured, Ethernet Cables', 'Do not flash firmware, Return in rack, Handle boards with care'],
    ['Insta360 X4 360 Camera', 'Insta360 X4 with invisible selfie stick, dive case (waterproof to 30m), extra battery, and editing software license. 8K 360-degree video.', '360 Camera', 30, 175, 520, '22 VR Content Lab', 'Miami', 'Excellent', '8K 360 Video, Invisible Stick, Dive Case 30m, Extra Battery, Software License', 'Handle lens with care, Rinse after saltwater, Return all accessories'],
  ];

  for (let i = 0; i < electronics.length; i++) {
    const e = electronics[i];
    await pool.query(
      `INSERT INTO listings (user_id, title, description, category, subcategory, price_per_day, price_per_week, price_per_month, location, city, item_condition, features, rules, views)
       VALUES ($1,$2,$3,'Electronics',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [uid(i), e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], e[9], e[10], Math.floor(Math.random() * 500) + 50]
    );
  }
  console.log(`  ${electronics.length} Electronics seeded.`);

  // ===================== TOOLS & EQUIPMENT (16) =====================
  const tools = [
    ['Professional Pressure Washer', '3100 PSI gas-powered pressure washer with multiple nozzle tips, surface cleaner, and 50ft hose. Fuel included for 4 hours.', 'Cleaning Equipment', 45, 250, 700, '67 Workshop Lane', 'Portland', 'Good', '3100 PSI, Multiple Nozzles, Surface Cleaner, 50ft Hose, Gas Included', 'Return cleaned, Report damage, Fuel refill if used more than 4hrs'],
    ['Table Saw & Woodworking Kit', 'DeWalt 10-inch table saw with stand, miter saw, circular saw, and accessories. Complete woodworking setup for your project.', 'Power Tools', 60, 350, 1100, '890 Builder Road', 'Chicago', 'Good', 'Table Saw, Miter Saw, Circular Saw, Blades, Safety Gear, Stand', 'Must have experience, Safety gear required, Return cleaned'],
    ['Commercial Generator 7500W', 'Champion 7500W dual-fuel generator. Runs on gas or propane. Electric start, multiple outlets including 240V.', 'Generator', 70, 400, 1300, '445 Power Street', 'Houston', 'Excellent', '7500 Watts, Dual Fuel, Electric Start, 240V Outlet, 8hr Runtime', 'Return with full tank, No indoor use, Noise curfew in residential areas'],
    ['Bobcat S70 Skid Steer', 'Compact Bobcat S70 skid steer loader with bucket and pallet forks. Perfect for tight spaces. Delivered and picked up to your site.', 'Heavy Equipment', 250, 1500, 4500, '100 Equipment Yard', 'Dallas', 'Good', 'Skid Steer, Bucket, Pallet Forks, Compact Size, Delivery Included', 'Operator experience required, Delivery/pickup included, Fuel not included'],
    ['Carpet Cleaner Commercial', 'Rug Doctor Pro commercial carpet cleaner with upholstery attachment, stair tool, and 2 gallons of cleaning solution.', 'Cleaning Equipment', 35, 190, 550, '22 Clean Supply Co', 'Denver', 'Good', 'Commercial Grade, Upholstery Tool, Stair Tool, 2gal Solution, 12in Path', 'Return empty and rinsed, Do not use on hardwood, Solution extra if needed'],
    ['Scaffolding Set 20ft', 'Complete 20-foot scaffolding set with guardrails, wheels with locks, planks, and outriggers. Supports up to 1000 lbs per platform.', 'Scaffolding', 55, 320, 1000, '500 Construction Ave', 'Philadelphia', 'Good', '20ft Height, Guardrails, Locking Wheels, Planks, Outriggers, 1000lb Capacity', 'Must follow OSHA guidelines, Inspect before use, Level ground required'],
    ['Concrete Mixer 9 cu ft', 'Kushlan 9 cubic foot gas-powered concrete mixer. Towable behind any vehicle with 2-inch hitch. Mixes up to 350lbs per batch.', 'Concrete Equipment', 65, 380, 1200, '88 Masonry Supply', 'Phoenix', 'Good', '9 cu ft, Gas Powered, Towable, 350lb Batch, 2-inch Hitch, Steel Drum', 'Return cleaned, Gas not included, Do not leave concrete to harden'],
    ['Chainsaw Kit with Safety Gear', 'Husqvarna 460 Rancher 24-inch chainsaw with helmet, chaps, gloves, extra chain, and bar oil. Professional-grade logging tool.', 'Chainsaw', 40, 230, 700, '15 Timber Trail', 'Boise', 'Good', 'Husqvarna 460, 24-inch Bar, Helmet, Chaps, Gloves, Extra Chain, Bar Oil', 'Safety gear REQUIRED, Must have experience, No felling trees near structures'],
    ['Air Compressor & Nail Gun Set', 'DeWalt 6-gallon pancake compressor with framing nailer, finish nailer, brad nailer, stapler, and assorted fasteners. 150 PSI max.', 'Pneumatic Tools', 40, 230, 700, '200 Hardware Hub', 'Milwaukee', 'Excellent', 'Compressor, Framing Nailer, Finish Nailer, Brad Nailer, Stapler, Fasteners', 'Drain water from tank daily, Return with empty tank, Use eye protection'],
    ['Floor Sander & Edger', 'Clarke floor drum sander and edger combo. Includes assorted sandpaper grits (36, 60, 80, 100), dust bags, and finishing pads.', 'Floor Tools', 55, 320, 1000, '300 Flooring World', 'Charlotte', 'Good', 'Drum Sander, Edger, Sandpaper 36-100 Grit, Dust Bags, Finishing Pads', 'Watch instructional video first, Extra sandpaper available, Return cleaned'],
    ['Tile Saw Wet Cutter 10"', 'DeWalt 10-inch wet tile saw with stand, folding rail system, and plunge capability. Diamond blade included. Cuts tile, stone, and porcelain.', 'Tile Equipment', 45, 260, 800, '45 Tile Pro Supply', 'Tampa', 'Excellent', '10-inch Wet Saw, Stand, Rail System, Plunge Cut, Diamond Blade, Water Pump', 'Use water system, Clean after use, Extra blades available for purchase'],
    ['Demolition Hammer 40lb', 'Bosch Brute 40lb electric demolition hammer with chisel bits, ground rod driver, and vibration-dampening handle. Breaks through anything.', 'Demolition', 55, 320, 1000, '160 Demo Supply', 'Detroit', 'Good', '40lb, Electric, Chisel Bits, Ground Rod Driver, Anti-Vibration, Carrying Case', 'Ear and eye protection required, Do not use on load-bearing walls without engineer approval'],
    ['Trencher Walk-Behind', 'Ditch Witch C16X walk-behind trencher. 36-inch depth, 6-inch width. Honda engine. Perfect for irrigation, electrical, or plumbing lines.', 'Trenching', 95, 550, 1700, '400 Underground Supply', 'Sacramento', 'Good', '36in Depth, 6in Width, Honda Engine, Walk-Behind, Carbide Teeth', 'Call 811 before digging, Operator experience required, Return cleaned'],
    ['Laser Level Construction Kit', 'Bosch self-leveling rotary laser level with tripod, grade rod, detector, and carrying case. 1000ft range outdoor. Interior and exterior use.', 'Measurement', 30, 175, 550, '75 Precision Tools', 'Raleigh', 'Excellent', 'Rotary Laser, Tripod, Grade Rod, Detector, 1000ft Range, Self-Leveling', 'Handle with care, Return in case, Calibration is current'],
    ['Stump Grinder', 'Rayco RG13 Series II stump grinder. Grinds stumps up to 13 inches below grade. Self-propelled with carbide teeth. Trailerable.', 'Landscaping', 120, 700, 2200, '250 Landscape Depot', 'Nashville', 'Good', 'Self-Propelled, Carbide Teeth, 13in Below Grade, Trailerable, Honda Engine', 'Operator experience required, Clear area of rocks, Return cleaned'],
    ['Paint Sprayer Airless', 'Graco Magnum X7 airless paint sprayer with 25ft hose, tip kit, and roller attachment. Sprays unthinned paint at up to 0.31 GPM.', 'Painting', 40, 230, 700, '55 Paint Pro Supply', 'Minneapolis', 'Excellent', 'Airless, 25ft Hose, Tip Kit, Roller Attachment, 0.31 GPM, Adjustable Pressure', 'Clean thoroughly after each use, Return with clean filter, Tips are consumable'],
  ];

  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    await pool.query(
      `INSERT INTO listings (user_id, title, description, category, subcategory, price_per_day, price_per_week, price_per_month, location, city, item_condition, features, rules, views)
       VALUES ($1,$2,$3,'Tools & Equipment',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [uid(i), t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], t[9], t[10], Math.floor(Math.random() * 500) + 50]
    );
  }
  console.log(`  ${tools.length} Tools & Equipment seeded.`);

  // ===================== SPORTS & OUTDOOR (16) =====================
  const sports = [
    ['Mountain Bike - Specialized Epic', 'Specialized Epic Expert full-suspension mountain bike. Carbon frame, SRAM Eagle, Fox suspension. Size Large. Helmet and repair kit included.', 'Bicycle', 40, 220, 700, '15 Trail Head Rd', 'Boulder', 'Excellent', 'Carbon Frame, Full Suspension, SRAM Eagle, Fox Forks, Helmet Included', 'Helmet required, No extreme stunts, Return cleaned, Report damage'],
    ['Kayak Tandem + Gear Package', 'Two-person sit-on-top kayak with paddles, life jackets, dry bags, and car-top straps. Great for lakes, rivers, and coastal waters.', 'Water Sports', 55, 300, 900, '22 Lakeside Marina', 'Seattle', 'Good', 'Tandem Kayak, 2 Paddles, 2 Life Jackets, Dry Bags, Car Straps', 'Must know how to swim, Life jackets mandatory, Rinse after saltwater'],
    ['Full Camping Setup for 4', 'Everything for a 4-person camping trip: tent, sleeping bags, air mattresses, camp stove, cookware, lantern, cooler, and camp chairs.', 'Camping', 50, 280, 850, '33 Adventure Way', 'Denver', 'Good', '4-Person Tent, 4 Sleeping Bags, Air Mattresses, Camp Stove, Cookware, Chairs, Cooler', 'Return dry and clean, No campfire on gear, Pack list provided'],
    ['Stand-Up Paddleboard Set', 'Two inflatable SUP boards (10ft and 11ft) with paddles, pumps, fins, leashes, and carrying backpacks. Inflate in 5 minutes.', 'Water Sports', 40, 230, 700, '5 Beach Rentals', 'San Diego', 'Good', '2 Inflatable SUPs, Paddles, Pumps, Fins, Leashes, Backpacks, Repair Kit', 'Life jackets recommended, Rinse after use, No sharp objects on board'],
    ['Ski Package - Expert Level', 'Volkl Mantra M6 skis (177cm), Marker Griffon bindings, Nordica boots (size adjustable 9-11), poles, and ski bag. Expert all-mountain setup.', 'Skiing', 45, 260, null, '200 Ski Tuning Shop', 'Park City', 'Excellent', 'Volkl Mantra, Marker Bindings, Nordica Boots, Poles, Ski Bag, Freshly Waxed', 'Return same day if daily rental, No terrain park, Report damage'],
    ['Surfboard Quiver (3 boards)', 'Three surfboard package: 6ft shortboard, 7ft funboard, and 9ft longboard. All with leashes, fins, and wax. Board bag for transport.', 'Surfing', 50, 290, 880, '10 Surf Shack', 'Huntington Beach', 'Good', '3 Boards (6ft/7ft/9ft), Leashes, Fins, Wax, Board Bag, Changing Mat', 'Rinse after each session, No reef breaks with longboard, Report dings'],
    ['Golf Club Set - Premium', 'Titleist TSR complete set: driver, 3-wood, 5-hybrid, 5-PW irons, 3 wedges, Scotty Cameron putter. Sun Mountain bag and headcovers.', 'Golf', 55, 320, null, '1 Country Club Drive', 'Scottsdale', 'Excellent', 'Titleist TSR Full Set, Scotty Cameron Putter, Sun Mountain Bag, Headcovers', 'Return cleaned, Replace divots, No throwing clubs, Shoe spikes only'],
    ['Rock Climbing Gear Set', 'Complete trad climbing rack: harness, rope (70m), 12 quickdraws, cams, nuts, helmet, belay device, and approach shoes (size 10).', 'Climbing', 45, 260, 800, '88 Crag Gear Co', 'Bishop', 'Good', 'Harness, 70m Rope, 12 Quickdraws, Cams, Nuts, Helmet, Belay Device, Shoes', 'Inspect all gear before use, Climbing at own risk, Knot knowledge required'],
    ['Snowboard Package', 'Burton Custom X snowboard (158cm) with Burton Step On bindings and Photon boots (size 10). Goggle, helmet, and board bag included.', 'Snowboarding', 40, 230, null, '50 Shred Shop', 'Breckenridge', 'Excellent', 'Burton Custom X, Step On Bindings, Photon Boots, Goggles, Helmet, Board Bag', 'Return dry, No rail grinding, Edge tune included'],
    ['Fishing Boat & Tackle Package', '14ft aluminum fishing boat with 9.9hp outboard, trolling motor, fish finder, 2 rods, tackle box, and trailer. Licensed for 4 passengers.', 'Fishing', 85, 500, 1500, 'Dock 7, River Marina', 'Bozeman', 'Good', '14ft Boat, 9.9hp Outboard, Trolling Motor, Fish Finder, 2 Rods, Tackle, Trailer', 'Boating license required, Life jackets provided, Clean fish off boat'],
    ['Tennis Equipment for 4', 'Four Wilson Blade rackets, ball hopper with 50 balls, net tension tester, and equipment bag. Court reservations not included.', 'Tennis', 20, 110, 330, '300 Tennis Center', 'Indian Wells', 'Good', '4 Wilson Blade Rackets, 50 Balls, Ball Hopper, Equipment Bag, Grips', 'Return rackets in cases, No throwing rackets, Report string breaks'],
    ['Scuba Diving Full Kit', 'Complete scuba set: Aqualung BCD, regulator, wetsuit (L), mask, fins, dive computer, and mesh bag. Tanks not included (rent at dive shop).', 'Diving', 50, 290, 880, '25 Dive Outfitters', 'Key Largo', 'Good', 'BCD, Regulator, Wetsuit L, Mask, Fins, Dive Computer, Mesh Bag', 'Must be PADI certified, Rinse after each dive, Tanks not included'],
    ['Backpacking Kit - Ultralight', 'Complete ultralight backpacking setup: Zpacks Duplex tent, Enlightened Equipment quilt, Gossamer Gear pack, Jetboil stove, water filter.', 'Backpacking', 35, 200, 600, '40 Thru-Hiker Supply', 'Asheville', 'Good', 'UL Tent, Down Quilt, 40L Pack, Jetboil, Sawyer Filter, Trekking Poles', 'Handle UL gear gently, Stuff sacks provided, Dry before returning'],
    ['Wakeboard & Tube Package', 'Hyperlite wakeboard with boots, 2-person towable tube, 75ft tow ropes, and spotter flag. Everything for a day on the water.', 'Water Sports', 45, 260, 780, '8 Wake Park Marina', 'Orlando', 'Good', 'Wakeboard, Boots, 2-Person Tube, 75ft Ropes, Spotter Flag, Life Vest', 'Life jackets required, Spotter required by law, Rinse after use'],
    ['Yoga & Meditation Retreat Kit', '4 premium yoga mats, blocks, straps, bolsters, meditation cushions, singing bowl, and Bluetooth speaker. Perfect for group retreats.', 'Yoga', 25, 140, 420, '100 Wellness Way', 'Sedona', 'Excellent', '4 Yoga Mats, Blocks, Straps, Bolsters, Meditation Cushions, Singing Bowl, Speaker', 'Return clean, No shoes on mats, Spray with provided cleaner after use'],
    ['Electric Skateboard Duo', 'Two Boosted Stealth electric skateboards with extended-range batteries. 24mph top speed, 14-mile range. Helmets and chargers included.', 'Skating', 35, 200, 600, '60 Boardwalk', 'Venice Beach', 'Good', '2 Boosted Stealth, Extended Batteries, Helmets, Chargers, 24mph, 14mi Range', 'Helmet required, No wet riding, Return charged, Must be 18+'],
  ];

  for (let i = 0; i < sports.length; i++) {
    const s = sports[i];
    await pool.query(
      `INSERT INTO listings (user_id, title, description, category, subcategory, price_per_day, price_per_week, price_per_month, location, city, item_condition, features, rules, views)
       VALUES ($1,$2,$3,'Sports & Outdoor',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [uid(i), s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], s[9], s[10], Math.floor(Math.random() * 500) + 50]
    );
  }
  console.log(`  ${sports.length} Sports & Outdoor seeded.`);

  // ===================== EVENT & PARTY (16) =====================
  const events = [
    ['Complete DJ Sound System', 'Pro DJ setup: 2x QSC K12.2 speakers, KS118 sub, Pioneer DDJ-1000, mic, cables, and stands. Power for 200+ guests.', 'Sound System', 150, 850, 2800, '78 Music Row', 'Nashville', 'Excellent', '2x QSC K12.2, KS118 Sub, Pioneer Controller, Mic, Stands, All Cables', 'Setup help available ($50), Return by noon next day, No outdoor rain use'],
    ['Party Tent 20x40 with Lighting', '20x40ft white event tent with sidewalls, string lights, 10 tables, and chairs for 80. Professional frame tent handles wind.', 'Tent & Furniture', 200, 1200, 3500, '99 Event Center Drive', 'Atlanta', 'Good', '20x40 Tent, Sidewalls, String Lights, 10 Tables, 80 Chairs, Setup Included', 'Flat ground required, 4-hour setup notice, Client handles ground stakes'],
    ['Photo Booth with Props', 'Mirror photo booth with instant printing, digital copies, GIF creation, and 100+ props. Includes backdrop, red carpet, and attendant for 4hrs.', 'Photo Booth', 175, null, null, '55 Party Lane', 'Miami', 'Excellent', 'Mirror Booth, Instant Prints, Digital Copies, GIFs, 100+ Props, Backdrop, Attendant', 'Power outlet within 50ft, Indoor or covered outdoor, 4-hour minimum'],
    ['Chocolate Fountain Package', 'Commercial 5-tier chocolate fountain with 20lbs Belgian chocolate, skewers, serving trays, dipping items display, and tablecloth. Serves 150.', 'Catering Equipment', 95, null, null, '10 Sweet Events', 'Dallas', 'Excellent', '5-Tier Fountain, 20lbs Chocolate, Skewers, Trays, Tablecloth, Serves 150', 'Power required, Level surface, Return cleaned, Extra chocolate available'],
    ['Karaoke Machine Pro', 'Professional karaoke system with dual wireless mics, 15-inch touchscreen, 50,000+ songs, disco lights, and fog machine. Life of the party.', 'Entertainment', 75, 420, null, '20 Fun Factory', 'Chicago', 'Good', 'Dual Wireless Mics, Touchscreen, 50K Songs, Disco Lights, Fog Machine', 'Indoor use preferred, Return by next day, Fog fluid included'],
    ['Wedding Arch & Decor Set', 'Elegant wooden wedding arch with draping, artificial flower arrangements, aisle runner, and 50 chair sashes. Rustic-chic style.', 'Wedding Decor', 120, null, null, '5 Bridal Boutique', 'Savannah', 'Excellent', 'Wooden Arch, Draping Fabric, Flower Arrangements, Aisle Runner, 50 Chair Sashes', 'Setup guide included, Handle flowers gently, Return folded neatly'],
    ['Bounce House Combo', 'Large bounce house with slide, basketball hoop, and climbing wall. 15x15ft footprint. Includes blower, stakes, and safety mat.', 'Kids Entertainment', 85, 480, null, '30 Fun Zone Rentals', 'Orlando', 'Good', '15x15ft, Slide, Basketball, Climbing Wall, Blower, Stakes, Safety Mat', 'Adult supervision required, Max weight 150lb per jumper, Flat ground only'],
    ['Outdoor Movie Screen 20ft', '20ft inflatable movie screen with HD projector, Bluetooth speaker system, and 50 blankets. Complete outdoor cinema experience.', 'Entertainment', 125, 750, null, '44 Cinema Under Stars', 'Austin', 'Good', '20ft Screen, HD Projector, Bluetooth Speakers, 50 Blankets, HDMI Cable', 'Set up at dusk, Power required, No rain, Return deflated and folded'],
    ['Cocktail Bar Setup', 'Portable cocktail bar with LED-lit counter, beer tap system, glassware for 100, ice bins, and bartender tools. Professional look.', 'Bar Equipment', 110, 650, null, '70 Mixology Supply', 'New York', 'Excellent', 'LED Bar Counter, Beer Taps, 100 Glasses, Ice Bins, Shakers, Jiggers, Speed Rail', 'Bartender not included, Return glassware clean, No glass on dance floor'],
    ['Stage Platform 12x16', '12x16ft portable stage with adjustable legs (24-48 inch height), stairs, skirting, and safety rails. Supports 125 PSF.', 'Stage Equipment', 180, 1050, null, '90 Production Supply', 'Nashville', 'Good', '12x16ft Stage, Adjustable 24-48in, Stairs, Skirting, Rails, 125 PSF', 'Level ground required, Professional setup available, Overnight ok'],
    ['Snow Cone & Popcorn Machines', 'Commercial snow cone machine, popcorn maker, and cotton candy spinner. Includes supplies for 200 servings each. Cart display included.', 'Food Equipment', 65, 370, null, '15 Carnival Rentals', 'Phoenix', 'Good', 'Snow Cone Machine, Popcorn Maker, Cotton Candy, Cart, Supplies for 200 Each', 'Power required (20amp), Clean after use, Extra supplies available'],
    ['Dance Floor 15x15 LED', '15x15ft LED dance floor with programmable color patterns, wireless controller, and edge trim. Creates an incredible ambiance.', 'Dance Equipment', 200, 1200, null, '60 Event Tech', 'Las Vegas', 'Excellent', '15x15ft LED Floor, Wireless Controller, Programmable Patterns, Edge Trim', 'Indoor or covered outdoor only, No stilettos, Setup 3 hours before event'],
    ['Red Carpet VIP Package', '50ft red carpet with stanchions, velvet ropes, step-and-repeat banner frame, paparazzi-style flash cameras, and VIP lanyards for 50.', 'VIP Experience', 90, null, null, '35 Celebrity Events', 'Los Angeles', 'Excellent', '50ft Red Carpet, Stanchions, Velvet Ropes, Step-and-Repeat Frame, Flash Cameras, 50 Lanyards', 'Custom banner printing available ($75), Return rolled, Handle stanchions carefully'],
    ['Taco Cart & Server', 'Authentic taco cart with warming stations, serving utensils, plates, napkins, and condiment setup for 100 guests. Server included for 3 hours.', 'Catering Equipment', 150, null, null, '25 Fiesta Catering', 'San Antonio', 'Good', 'Taco Cart, Warming Stations, Utensils, Plates, Napkins, Condiments, Server 3hrs', 'Food not included, Server gratuity appreciated, 48hr advance booking'],
    ['Flower Wall Backdrop 8x8', '8x8ft artificial flower wall in blush pink and white roses. Self-standing frame with weighted base. Perfect for photos and events.', 'Backdrop', 85, null, null, '40 Bloom & Co', 'Charleston', 'Excellent', '8x8ft Flower Wall, Self-Standing Frame, Weighted Base, Blush Pink & White Roses', 'Indoor or covered outdoor, Handle gently, No pins or staples on flowers'],
    ['Lighting Package - Full Event', 'Complete event lighting: 20 uplights, 4 moving heads, LED wash bars, truss system, DMX controller, and fog machine. Transform any venue.', 'Lighting', 175, 1000, null, '80 LightCraft Studio', 'Miami', 'Excellent', '20 Uplights, 4 Moving Heads, LED Wash, Truss, DMX Controller, Fog Machine, Cables', 'Setup 4hrs before event, Return next day, Professional setup available ($100)'],
  ];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    await pool.query(
      `INSERT INTO listings (user_id, title, description, category, subcategory, price_per_day, price_per_week, price_per_month, location, city, item_condition, features, rules, views)
       VALUES ($1,$2,$3,'Event & Party',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [uid(i), ev[0], ev[1], ev[2], ev[3], ev[4], ev[5], ev[6], ev[7], ev[8], ev[9], ev[10], Math.floor(Math.random() * 500) + 50]
    );
  }
  console.log(`  ${events.length} Event & Party seeded.`);

  const totalListings = properties.length + vehicles.length + electronics.length + tools.length + sports.length + events.length;
  console.log(`\n  TOTAL: ${totalListings} listings across 6 categories.`);

  // ===================== BOOKINGS (25) =====================
  // uid mapping: listing i → owner = (i % 5) + 1. So listing_id X → owner = ((X-1) % 5) + 1
  // Demo user (1) owns listings: 1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71, 76, 81, 86, 91, 96
  await pool.query(`INSERT INTO bookings (listing_id, renter_id, owner_id, start_date, end_date, total_price, status, message) VALUES
    (2, 1, 2, '2025-03-01', '2025-03-05', 1000.00, 'completed', 'Family vacation at the beach!'),
    (3, 1, 3, '2025-03-10', '2025-03-17', 1260.00, 'completed', 'Mountain retreat for the week'),
    (17, 1, 2, '2025-03-15', '2025-03-18', 267.00, 'completed', 'Road trip to Napa Valley'),
    (33, 1, 3, '2025-04-01', '2025-04-03', 130.00, 'confirmed', 'Need it for a wedding shoot'),
    (49, 5, 4, '2025-04-05', '2025-04-07', 90.00, 'confirmed', 'Spring cleaning the deck'),
    (65, 1, 5, '2025-04-10', '2025-04-14', 160.00, 'pending', 'Weekend trail ride'),
    (82, 4, 2, '2025-04-20', '2025-04-21', 150.00, 'pending', 'Birthday party DJ'),
    (4, 5, 4, '2025-05-01', '2025-05-08', 2450.00, 'confirmed', 'Memorial Day penthouse stay'),
    (18, 1, 3, '2025-05-15', '2025-05-19', 480.00, 'pending', 'Coastal road trip!'),
    (22, 4, 2, '2025-05-20', '2025-05-22', 150.00, 'confirmed', 'Weekend motorcycle ride'),
    (1, 2, 1, '2025-06-01', '2025-06-05', 600.00, 'completed', 'Business trip to downtown'),
    (1, 3, 1, '2025-06-10', '2025-06-14', 600.00, 'confirmed', 'Quick NYC visit'),
    (6, 4, 1, '2025-06-15', '2025-06-18', 255.00, 'completed', 'Solo trip to LA studio'),
    (11, 2, 1, '2025-06-20', '2025-06-25', 950.00, 'confirmed', 'Oceanfront vacation'),
    (16, 5, 1, '2025-07-01', '2025-07-03', 270.00, 'pending', 'Key West getaway'),
    (21, 3, 1, '2025-07-10', '2025-07-12', 258.00, 'completed', 'Moving day truck rental'),
    (31, 4, 1, '2025-07-15', '2025-07-17', 110.00, 'confirmed', 'Podcast recording setup'),
    (36, 2, 1, '2025-08-01', '2025-08-04', 270.00, 'pending', 'Aerial drone photography'),
    (41, 5, 1, '2025-08-10', '2025-08-14', 200.00, 'completed', 'Concrete mixer for patio'),
    (81, 3, 1, '2025-08-20', '2025-08-21', 150.00, 'confirmed', 'Wedding DJ system'),
    (34, 3, 4, '2025-06-01', '2025-06-05', 220.00, 'pending', 'Video editing project'),
    (35, 1, 5, '2025-06-10', '2025-06-12', 170.00, 'confirmed', 'Aerial photography'),
    (67, 2, 2, '2025-06-15', '2025-06-18', 150.00, 'completed', 'Family camping at Yellowstone'),
    (69, 2, 4, '2025-09-01', '2025-09-03', 100.00, 'confirmed', 'Golf weekend tournament'),
    (90, 1, 5, '2025-09-10', '2025-09-12', 250.00, 'pending', 'Wedding cocktail bar setup')
  `);
  console.log('25 bookings created.');

  // ===================== REVIEWS (30) =====================
  await pool.query(`INSERT INTO reviews (listing_id, booking_id, reviewer_id, rating, comment) VALUES
    (1, 1, 1, 5, 'Amazing loft with incredible city views! Alice was a fantastic host. The kitchen was well-equipped and the bed was super comfortable.'),
    (2, 2, 1, 5, 'Best beach house we have ever stayed at. Kids loved it! The deck was perfect for sunsets. Beach gear was a thoughtful touch.'),
    (17, 3, 1, 5, 'Tesla was spotless and fully charged. Autopilot made the highway portion effortless. Supercharger stops were seamless.'),
    (1, null, 3, 4, 'Great location and clean space. Minor street noise on Saturday night. Otherwise perfect for business travel.'),
    (2, null, 4, 5, 'Absolutely stunning property. Ocean views are better than the photos. BBQ grill was in perfect condition.'),
    (18, null, 1, 5, 'The VW camper was an absolute dream! Turned heads everywhere. Kitchenette was super handy at campsites.'),
    (33, null, 1, 5, 'Camera quality is outstanding. Both lenses were perfect for the event. Extra batteries were a lifesaver.'),
    (3, null, 5, 4, 'Cabin was beautiful but the hot tub took a while to heat up. Mountain views are breathtaking. Game room was a bonus.'),
    (65, null, 2, 5, 'Best mountain bike I have ridden. Suspension handled everything the trail threw at it. Eagle drivetrain shifts like butter.'),
    (81, null, 4, 5, 'Sound system was incredible! Our party was a huge hit. The sub fills a big room easily.'),
    (67, 13, 2, 5, 'Perfect camping setup. Tent was easy to pitch, sleeping bags were warm, camp stove worked great.'),
    (83, null, 5, 4, 'Photo booth was a huge hit at our corporate event. Print quality was great. Prop selection could be updated.'),
    (49, null, 5, 4, 'Pressure washer got the job done on my driveway. Could use a longer hose. Good value.'),
    (66, null, 1, 5, 'Kayak was stable and easy to paddle. Life jackets fit well. Amazing time on the water.'),
    (22, null, 4, 5, 'What a ride! Harley ran perfectly. Gear was clean and fit well. Dave gave great route recommendations.'),
    (51, null, 3, 4, 'Generator powered our entire outdoor event without issues. A bit heavy to move. Electric start is convenient.'),
    (34, null, 3, 5, 'MacBook was blazing fast. Creative Suite pre-installed saved tons of time. Battery life is insane.'),
    (82, null, 2, 5, 'Tent setup was professional and quick. Lights created a magical atmosphere. Tables and chairs were sturdy.'),
    (4, null, 1, 5, 'The penthouse was jaw-dropping. Rooftop terrace views are unreal. Concierge helped with dinner reservations.'),
    (20, null, 2, 5, 'Porsche 911 was the highlight of our trip. The sound of that engine through the canyons was unforgettable.'),
    (36, null, 1, 4, 'Canon cinema kit was complete and well-maintained. Atomos recorder made a huge difference for our short film.'),
    (52, null, 4, 5, 'Scaffolding was exactly what we needed for our painting job. Wheels with locks made repositioning easy.'),
    (69, null, 3, 4, 'Golf clubs were premium quality. Scotty Cameron putter was a dream. Returned them with a lower handicap!'),
    (85, null, 1, 5, 'Chocolate fountain was a show-stopper at our wedding. Belgian chocolate was delicious. Guests loved it.'),
    (7, null, 2, 5, 'Desert villa was perfection. Pool was crystal clear, fire pit under the stars was magical. Southwest charm everywhere.'),
    (25, null, 5, 4, 'Sprinter RV was like a hotel on wheels. Full bathroom was a game-changer. Solar kept everything powered.'),
    (40, null, 3, 5, 'GoPro adventure kit captured incredible footage on our snowboard trip. Waterproof cases worked perfectly.'),
    (55, null, 2, 4, 'Air compressor and nail gun set made our fence project go 10x faster. All fasteners were well-organized.'),
    (71, null, 4, 5, 'Ski package was expertly tuned. Volkl Mantras carved beautifully. Boot fit was comfortable all day.'),
    (93, null, 1, 5, 'LED dance floor transformed our venue completely. Guests could not stop taking photos. Worth every penny.')
  `);

  // Update listing ratings
  await pool.query(`
    UPDATE listings l SET
      rating = sub.avg_rating,
      review_count = sub.cnt
    FROM (
      SELECT listing_id, AVG(rating)::numeric(2,1) as avg_rating, COUNT(*) as cnt
      FROM reviews GROUP BY listing_id
    ) sub
    WHERE l.id = sub.listing_id
  `);
  console.log('30 reviews created and ratings updated.');

  // Favorites
  await pool.query(`INSERT INTO favorites (user_id, listing_id) VALUES
    (1, 2), (1, 18), (1, 33), (1, 81), (1, 20), (1, 7),
    (2, 3), (2, 35), (2, 69),
    (3, 17), (3, 4), (3, 82),
    (4, 66), (4, 22), (4, 85),
    (5, 1), (5, 65), (5, 40)
  `);
  console.log('18 favorites created.');

  // Messages
  await pool.query(`INSERT INTO messages (sender_id, receiver_id, listing_id, content) VALUES
    (1, 2, 1, 'Hi Alice! Is the downtown loft available for March 1-5?'),
    (2, 1, 1, 'Yes it is! I will confirm your booking right away.'),
    (1, 3, 2, 'Do you provide beach towels with the house rental?'),
    (3, 1, 2, 'Absolutely! We have towels, umbrellas, and boogie boards.'),
    (1, 2, 17, 'How is the range on the Tesla for a Napa trip?'),
    (2, 1, 17, 'Plenty of range. Superchargers along the route too.'),
    (4, 2, 81, 'Can you help with setup for the DJ system?'),
    (2, 4, 81, 'Of course! Setup is $50 and I will be there 2 hours early.'),
    (5, 3, 83, 'Do you customize photo strip designs for corporate events?'),
    (3, 5, 83, 'Yes! Send your logo and I will make a custom template.'),
    (1, 4, 36, 'Is the Canon cinema kit available for a 3-day shoot next month?'),
    (4, 1, 36, 'Let me check the calendar. What dates are you looking at?'),
    (2, 5, 22, 'What routes do you recommend for the Harley around Austin?'),
    (5, 2, 22, 'Hill Country is amazing! I can share my favorite loop route.')
  `);
  console.log('14 messages created.');

  // ===================== NOTIFICATIONS (20 for demo user) =====================
  await pool.query(`INSERT INTO notifications (user_id, type, title, message, link, read, created_at) VALUES
    (1, 'booking', 'New Booking Request', 'Alice Johnson wants to book "Modern Downtown Loft" for Jun 1-5', '/bookings', false, NOW() - INTERVAL '10 minutes'),
    (1, 'booking', 'New Booking Request', 'Carol Williams wants to book "Modern Downtown Loft" for Jun 10-14', '/bookings', false, NOW() - INTERVAL '25 minutes'),
    (1, 'booking', 'Booking Confirmed', 'Your booking for "Cozy Beach House" has been confirmed by the host', '/bookings', false, NOW() - INTERVAL '1 hour'),
    (1, 'review', 'New Review', 'Your listing "Urban Studio Apartment" received a 5-star review', '/browse', false, NOW() - INTERVAL '2 hours'),
    (1, 'message', 'New Message', 'Alice Johnson sent you a message about "Modern Downtown Loft"', '/messages', false, NOW() - INTERVAL '3 hours'),
    (1, 'booking', 'Booking Completed', 'Your booking for "Tesla Model Y" has been marked as completed', '/bookings', true, NOW() - INTERVAL '5 hours'),
    (1, 'review', 'New Review', 'Dave Chen reviewed "Modern Downtown Loft" with 4 stars', '/browse', false, NOW() - INTERVAL '6 hours'),
    (1, 'message', 'New Message', 'Bob Martinez replied to your question about the Harley Davidson', '/messages', true, NOW() - INTERVAL '8 hours'),
    (1, 'booking', 'New Booking Request', 'Dave Chen wants to book "Urban Studio Apartment" for Jul 15-17', '/bookings', false, NOW() - INTERVAL '12 hours'),
    (1, 'review', 'New Review', 'Your listing "Oceanfront Condo" received a 5-star review from Alice', '/browse', true, NOW() - INTERVAL '1 day'),
    (1, 'booking', 'Booking Confirmed', 'Your booking for "Mountain Cabin Retreat" has been confirmed', '/bookings', true, NOW() - INTERVAL '1 day 3 hours'),
    (1, 'message', 'New Message', 'Carol Williams asked about availability for your DJ Equipment', '/messages', false, NOW() - INTERVAL '1 day 5 hours'),
    (1, 'booking', 'New Booking Request', 'Bob Martinez wants to book "Professional Drone Kit" for Aug 1-4', '/bookings', false, NOW() - INTERVAL '2 days'),
    (1, 'review', 'New Review', 'Alice Johnson left a 4-star review on "Moving Truck Rental"', '/browse', true, NOW() - INTERVAL '2 days 6 hours'),
    (1, 'booking', 'Booking Completed', 'Rental of "Concrete Mixer" has been completed. $200 earned!', '/bookings', true, NOW() - INTERVAL '3 days'),
    (1, 'message', 'New Message', 'Dave Chen sent you a message: "Thanks for the great experience!"', '/messages', true, NOW() - INTERVAL '3 days 2 hours'),
    (1, 'booking', 'Booking Cancelled', 'A booking for "Modern Downtown Loft" was cancelled by the renter', '/bookings', true, NOW() - INTERVAL '4 days'),
    (1, 'review', 'New Review', 'Your listing "Podcast Recording Kit" received a 5-star review', '/browse', true, NOW() - INTERVAL '5 days'),
    (1, 'booking', 'New Booking Request', 'Carol Williams wants to book "Wedding DJ System" for Aug 20', '/bookings', false, NOW() - INTERVAL '5 days 4 hours'),
    (1, 'message', 'New Message', 'Alice Johnson: "Is the loft available for September?"', '/messages', false, NOW() - INTERVAL '6 days')
  `);
  console.log('20 notifications created.');

  // ===================== SUBSCRIPTION PLANS (18 - 3 per listing for 6 listings) =====================
  // Listings used: 1 (Properties), 17 (Vehicles), 33 (Electronics), 49 (Tools), 65 (Sports), 81 (Event)
  await pool.query(`INSERT INTO subscription_plans (listing_id, owner_id, plan_name, monthly_price, includes_maintenance, includes_repair, includes_parts, includes_inspection, includes_priority_support, max_service_requests, response_time_hours, contract_duration_months, description) VALUES
    (1, 1, 'Basic', 99.99, true, false, false, true, false, 3, 48, 3, 'Basic maintenance coverage for the Downtown Loft. Includes routine inspections and basic maintenance.'),
    (1, 1, 'Standard', 199.99, true, true, false, true, false, 8, 24, 6, 'Standard coverage includes maintenance, repairs, and regular inspections for the Downtown Loft.'),
    (1, 1, 'Premium', 349.99, true, true, true, true, true, 20, 4, 12, 'Full premium coverage for the Downtown Loft. All services included with priority support and 4-hour response time.'),
    (17, 2, 'Basic', 79.99, true, false, false, true, false, 3, 48, 3, 'Basic maintenance for the Tesla Model 3. Includes tire checks, fluid top-offs, and inspections.'),
    (17, 2, 'Standard', 159.99, true, true, false, true, false, 8, 24, 6, 'Standard coverage for the Tesla. Maintenance, repairs, and bi-weekly inspections included.'),
    (17, 2, 'Premium', 299.99, true, true, true, true, true, 20, 4, 12, 'Premium Tesla coverage with parts replacement, priority support, and 4-hour roadside response.'),
    (33, 3, 'Basic', 49.99, true, false, false, true, false, 3, 48, 3, 'Basic care for the Sony A7 IV kit. Sensor cleaning and basic maintenance.'),
    (33, 3, 'Standard', 99.99, true, true, false, true, true, 8, 24, 6, 'Standard coverage for the camera kit. Maintenance, repairs, and priority support.'),
    (33, 3, 'Premium', 179.99, true, true, true, true, true, 20, 4, 12, 'Full premium coverage. Includes lens replacements, firmware updates, and emergency support.'),
    (49, 4, 'Basic', 59.99, true, false, false, true, false, 3, 48, 3, 'Basic maintenance for the pressure washer. Oil changes and nozzle inspections.'),
    (49, 4, 'Standard', 119.99, true, true, false, true, false, 8, 24, 6, 'Standard coverage includes engine maintenance, hose repairs, and scheduled inspections.'),
    (49, 4, 'Premium', 219.99, true, true, true, true, true, 20, 4, 12, 'Premium coverage with parts replacement, priority response, and full engine service.'),
    (65, 5, 'Basic', 39.99, true, false, false, true, false, 3, 48, 3, 'Basic bike maintenance. Chain lubrication, brake adjustments, and pre-ride inspections.'),
    (65, 5, 'Standard', 89.99, true, true, false, true, false, 8, 24, 6, 'Standard coverage for the Specialized Epic. Suspension service, wheel truing, and repairs.'),
    (65, 5, 'Premium', 159.99, true, true, true, true, true, 20, 4, 12, 'Premium coverage with parts replacement, drivetrain overhaul, and same-day support.'),
    (81, 1, 'Basic', 89.99, true, false, false, true, false, 3, 48, 3, 'Basic maintenance for the DJ system. Speaker cleaning and cable testing.'),
    (81, 1, 'Standard', 179.99, true, true, false, true, true, 8, 24, 6, 'Standard coverage for the DJ system. Repairs, maintenance, and priority phone support.'),
    (81, 1, 'Premium', 329.99, true, true, true, true, true, 20, 4, 12, 'Premium DJ system coverage. Full parts replacement, backup equipment, and 4-hour response.')
  `);
  console.log('18 subscription plans created.');

  // ===================== SERVICE CONTRACTS (6) =====================
  await pool.query(`INSERT INTO service_contracts (booking_id, plan_id, listing_id, renter_id, owner_id, plan_name, monthly_price, includes_maintenance, includes_repair, includes_parts, includes_inspection, includes_priority_support, max_service_requests, response_time_hours, contract_duration_months, status, auto_renew, terms, start_date, end_date) VALUES
    (11, 3, 1, 2, 1, 'Premium', 349.99, true, true, true, true, true, 20, 4, 12, 'active', true, 'Premium service contract for Modern Downtown Loft. Includes all maintenance, repairs, parts replacement, inspections, and priority support. 4-hour response time guaranteed. Maximum 20 service requests per contract period.', '2025-06-01', '2026-06-01'),
    (12, 2, 1, 3, 1, 'Standard', 199.99, true, true, false, true, false, 8, 24, 6, 'active', false, 'Standard service contract for Modern Downtown Loft. Includes maintenance, repairs, and inspections. 24-hour response time. Maximum 8 service requests per contract period.', '2025-06-10', '2025-12-10'),
    (3, 5, 17, 1, 2, 'Standard', 159.99, true, true, false, true, false, 8, 24, 6, 'expired', false, 'Standard service contract for Tesla Model 3. Includes maintenance, repairs, and bi-weekly inspections.', '2025-03-15', '2025-09-15'),
    (4, 7, 33, 1, 3, 'Basic', 49.99, true, false, false, true, false, 3, 48, 3, 'active', true, 'Basic service contract for Sony A7 IV Camera Kit. Includes sensor cleaning and basic maintenance.', '2025-04-01', '2025-07-01'),
    (13, 10, 49, 4, 1, 'Basic', 59.99, true, false, false, true, false, 3, 48, 3, 'cancelled', false, 'Basic service contract for Professional Pressure Washer. Oil changes and nozzle inspections.', '2025-06-20', '2025-09-20'),
    (20, 17, 81, 3, 1, 'Standard', 179.99, true, true, false, true, true, 8, 24, 6, 'active', true, 'Standard service contract for Complete DJ Sound System. Repairs, maintenance, and priority phone support.', '2025-08-20', '2026-02-20')
  `);
  console.log('6 service contracts created.');

  // ===================== SERVICE REQUESTS (10) =====================
  await pool.query(`INSERT INTO service_requests (contract_id, listing_id, renter_id, owner_id, type, priority, status, title, description, estimated_cost, actual_cost, opened_at, assigned_at, resolved_at, closed_at) VALUES
    (1, 1, 2, 1, 'maintenance', 'medium', 'resolved', 'HVAC filter replacement needed', 'The air conditioning filter needs to be replaced. Airflow has decreased noticeably.', 50.00, 45.00, NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days', NOW() - INTERVAL '27 days', NOW() - INTERVAL '26 days'),
    (1, 1, 2, 1, 'repair', 'high', 'in_progress', 'Kitchen faucet leaking', 'The kitchen faucet has developed a slow leak. Dripping about once every 2 seconds.', 120.00, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NULL, NULL),
    (1, 1, 2, 1, 'inspection', 'low', 'open', 'Quarterly property inspection', 'Scheduled quarterly inspection for the Downtown Loft unit.', NULL, NULL, NOW() - INTERVAL '1 day', NULL, NULL, NULL),
    (2, 1, 3, 1, 'maintenance', 'medium', 'closed', 'Window cleaning service', 'Floor-to-ceiling windows need professional cleaning.', 200.00, 180.00, NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days', NOW() - INTERVAL '42 days', NOW() - INTERVAL '41 days'),
    (3, 17, 1, 2, 'repair', 'urgent', 'resolved', 'Flat tire on highway', 'Got a flat tire on Highway 101. Need emergency roadside assistance.', 150.00, 175.00, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '59 days'),
    (3, 17, 1, 2, 'maintenance', 'low', 'closed', 'Scheduled tire rotation', 'Regular tire rotation and pressure check as part of maintenance plan.', 75.00, 75.00, NOW() - INTERVAL '90 days', NOW() - INTERVAL '89 days', NOW() - INTERVAL '88 days', NOW() - INTERVAL '87 days'),
    (4, 33, 1, 3, 'parts_replacement', 'medium', 'open', 'Lens cap replacement', 'The 28-70mm lens cap is cracked and needs replacement.', 25.00, NULL, NOW() - INTERVAL '5 days', NULL, NULL, NULL),
    (4, 33, 1, 3, 'maintenance', 'low', 'open', 'Sensor cleaning due', 'Camera sensor has visible dust spots. Needs professional cleaning.', 40.00, NULL, NOW() - INTERVAL '2 days', NULL, NULL, NULL),
    (6, 81, 3, 1, 'emergency', 'urgent', 'in_progress', 'Speaker crackling during event', 'Left QSC K12.2 speaker started crackling mid-event. Need immediate replacement or fix.', 300.00, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NULL, NULL),
    (6, 81, 3, 1, 'repair', 'high', 'open', 'Pioneer controller crossfader issue', 'The crossfader on the DDJ-1000 is not responding smoothly. Needs repair or replacement.', 200.00, NULL, NOW() - INTERVAL '4 hours', NULL, NULL, NULL)
  `);
  console.log('10 service requests created.');

  // ===================== SERVICE REQUEST UPDATES (15) =====================
  await pool.query(`INSERT INTO service_request_updates (request_id, user_id, comment, new_status, created_at) VALUES
    (1, 2, 'The HVAC filter hasnt been changed in months. Air quality is getting poor.', NULL, NOW() - INTERVAL '30 days'),
    (1, 1, 'Ill send our maintenance team tomorrow morning. We have the replacement filter in stock.', 'in_progress', NOW() - INTERVAL '29 days'),
    (1, 1, 'Filter has been replaced. Also cleaned the duct vents while we were there.', 'resolved', NOW() - INTERVAL '27 days'),
    (1, 2, 'Confirmed - air quality is much better now. Thank you for the quick response!', 'closed', NOW() - INTERVAL '26 days'),
    (2, 2, 'Kitchen faucet started leaking yesterday. Getting worse.', NULL, NOW() - INTERVAL '3 days'),
    (2, 1, 'Scheduled a plumber for tomorrow between 10am-12pm. Will you be available?', 'in_progress', NOW() - INTERVAL '2 days'),
    (2, 2, 'Yes, I will be home. Thanks for the quick scheduling!', NULL, NOW() - INTERVAL '2 days'),
    (4, 3, 'The floor-to-ceiling windows are looking quite dirty. Can we schedule a cleaning?', NULL, NOW() - INTERVAL '45 days'),
    (4, 1, 'Professional window cleaning team scheduled for this Thursday.', 'in_progress', NOW() - INTERVAL '44 days'),
    (4, 1, 'Windows have been cleaned. Inside and outside done.', 'resolved', NOW() - INTERVAL '42 days'),
    (4, 3, 'They look amazing! Great service.', 'closed', NOW() - INTERVAL '41 days'),
    (5, 1, 'EMERGENCY: Flat tire on Highway 101, mile marker 234. Need roadside assistance ASAP.', NULL, NOW() - INTERVAL '60 days'),
    (5, 2, 'Roadside assistance dispatched. ETA 25 minutes. Stay safe!', 'in_progress', NOW() - INTERVAL '60 days'),
    (5, 2, 'Tire replaced. Full inspection done - all other tires in good condition.', 'resolved', NOW() - INTERVAL '60 days'),
    (9, 3, 'URGENT: Left speaker started crackling during a live event. Need immediate help!', NULL, NOW() - INTERVAL '1 day')
  `);
  console.log('15 service request updates created.');

  // ===================== MAINTENANCE SCHEDULES (8) =====================
  await pool.query(`INSERT INTO maintenance_schedules (contract_id, listing_id, owner_id, title, description, frequency, next_due_date, last_completed_date, status) VALUES
    (1, 1, 1, 'Monthly HVAC Inspection', 'Check HVAC system, replace filters if needed, test thermostat', 'monthly', CURRENT_DATE + INTERVAL '12 days', CURRENT_DATE - INTERVAL '18 days', 'scheduled'),
    (1, 1, 1, 'Quarterly Deep Clean', 'Professional deep cleaning of the entire loft unit', 'quarterly', CURRENT_DATE + INTERVAL '45 days', CURRENT_DATE - INTERVAL '45 days', 'scheduled'),
    (1, 1, 1, 'Weekly Common Area Check', 'Inspect common areas, check lighting, test smoke detectors', 'weekly', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE - INTERVAL '4 days', 'scheduled'),
    (3, 17, 2, 'Monthly Tire Pressure Check', 'Check all tire pressures and adjust to spec. Inspect tread depth.', 'monthly', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '35 days', 'overdue'),
    (4, 33, 3, 'Monthly Sensor Cleaning', 'Professional sensor cleaning and firmware update check', 'monthly', CURRENT_DATE + INTERVAL '20 days', CURRENT_DATE - INTERVAL '10 days', 'scheduled'),
    (6, 81, 1, 'Quarterly Speaker Calibration', 'Full speaker calibration, cable testing, and firmware updates', 'quarterly', CURRENT_DATE + INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days', 'scheduled'),
    (2, 1, 1, 'Monthly Plumbing Check', 'Inspect all plumbing fixtures, check for leaks, test water pressure', 'monthly', CURRENT_DATE + INTERVAL '8 days', CURRENT_DATE - INTERVAL '22 days', 'scheduled'),
    (6, 81, 1, 'One-Time Pre-Event Setup Check', 'Complete system check before the upcoming wedding event', 'one_time', CURRENT_DATE + INTERVAL '5 days', NULL, 'scheduled')
  `);
  console.log('8 maintenance schedules created.');

  console.log('\n========================================');
  console.log('  Seed complete!');
  console.log('Demo login users provisioned from the local environment.');
  console.log('========================================');
  process.exit(0);
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
