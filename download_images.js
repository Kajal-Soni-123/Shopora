const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const imageMap = {
  shipra_prod_teak_table: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_ergo_chair: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_nordic_sofa: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_oak_coffee_table: 'https://images.unsplash.com/photo-1532323544230-7191fd51bc1b?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_armchair: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=85',

  shipra_prod_air_purifier: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_espresso_maker: 'https://images.unsplash.com/photo-1517668808822-9ebe02f2a6e8?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_robot_vacuum: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=1000&q=85',

  shipra_prod_oxford_shirt: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_linen_shirt: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_denim_shirt: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=85',

  shipra_prod_ribbed_tank: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_racerback_tank: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_cotton_tank: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=85',

  shipra_prod_sunscreen_spf50: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_mineral_sunscreen: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1000&q=85',

  shipra_prod_moisturiser_hyaluronic: 'https://images.unsplash.com/photo-1608248597263-0007823f03b5?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_ceramide_cream: 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=1000&q=85',

  shipra_prod_vitc_serum: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_niacinamide_serum: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_retinol_serum: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1000&q=85',
  shipra_prod_peptide_serum: 'https://images.unsplash.com/photo-1567928256565-df048206d2dd?auto=format&fit=crop&w=1000&q=85',

  prod_arctic_parka: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=1000&q=85',
  'prod_merino:sweater': 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1000&q=85',
  prod_anc_headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=85',
  prod_commuter_backpack: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85'
};

function downloadFile(urlStr, destPath, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'));

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    };

    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        let redirectUrl = response.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${redirectUrl}`;
        }
        return downloadFile(redirectUrl, destPath, redirects + 1).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`Failed with status code ${response.statusCode}`));
      }

      const file = fs.createWriteStream(destPath);
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(destPath));
      });
      file.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    req.on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });

    req.end();
  });
}

async function main() {
  const dir = path.join(__dirname, 'public', 'images', 'products');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log('Downloading high-resolution product images with User-Agent...');

  for (const [prodId, url] of Object.entries(imageMap)) {
    const filename = `${prodId.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`;
    const localPath = path.join(dir, filename);
    const publicUrl = `/images/products/${filename}`;

    try {
      console.log(`Downloading image for ${prodId}...`);
      await downloadFile(url, localPath);
      console.log(`✓ Saved ${filename} (${fs.statSync(localPath).size} bytes)`);

      const existingProduct = await prisma.product.findUnique({ where: { id: prodId } });
      if (existingProduct) {
        await prisma.product.update({
          where: { id: prodId },
          data: {
            image: publicUrl,
            images: [publicUrl, url]
          }
        });
        console.log(`✓ Updated DB product ${prodId} -> ${publicUrl}`);
      }
    } catch (err) {
      console.error(`✕ Error downloading ${prodId}:`, err.message);
    }
  }

  console.log('Finished downloading and updating product images!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
