-- Updated shipping rates (May 2026)
UPDATE shipping_rates SET rate = 15.00, label = 'Standard Shipping (USA)'
WHERE zone = 'usa' AND method = 'standard';

UPDATE shipping_rates SET rate = 25.00, label = 'Express Shipping (USA)'
WHERE zone = 'usa' AND method = 'express';

UPDATE shipping_rates SET rate = 35.00, label = 'Standard Shipping (International)'
WHERE zone = 'international' AND method = 'standard';

UPDATE shipping_rates SET rate = 55.00, label = 'Express Shipping (International)'
WHERE zone = 'international' AND method = 'express';
