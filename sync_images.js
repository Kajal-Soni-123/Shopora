const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const sourceDir = '/home/kajal/.gemini/antigravity/brain/a54f6a74-d454-477b-a309-80b2c58ec4ef';
const targetDir = path.join(__dirname, 'public', 'images', 'products');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.png'));

const imageMap = {
  shipra_prod_teak_table: files.find(f => f.startsWith('teak_dining_table')),
  shipra_prod_ergo_chair: files.find(f => f.startsWith('ergo_chair')),
  shipra_prod_nordic_sofa: files.find(f => f.startsWith('nordic_sofa')),
  shipra_prod_oak_coffee_table: files.find(f => f.startsWith('oak_coffee_table')),
  shipra_prod_armchair: files.find(f => f.startsWith('emerald_armchair')),
  shipra_prod_air_purifier: files.find(f => f.startsWith('air_purifier')),
  shipra_prod_espresso_maker: files.find(f => f.startsWith('espresso_maker')),
  shipra_prod_oxford_shirt: files.find(f => f.startsWith('oxford_shirt')),
  shipra_prod_ribbed_tank: files.find(f => f.startsWith('ribbed_tank')),
};

async function main() {
  console.log('Copying generated images...');
  for (const [prodId, fileName] of Object.entries(imageMap)) {
    if (fileName) {
      const srcPath = path.join(sourceDir, fileName);
      const destName = `${prodId}.png`;
      const destPath = path.join(targetDir, destName);
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${fileName} -> ${destName}`);

      const publicUrl = `/images/products/${destName}`;
      const exists = await prisma.product.findUnique({ where: { id: prodId } });
      if (exists) {
        await prisma.product.update({
          where: { id: prodId },
          data: { image: publicUrl, images: [publicUrl] }
        });
        console.log(`Updated DB product ${prodId} with image: ${publicUrl}`);
      }
    }
  }

  // Map remaining products to appropriate category images
  const allProducts = await prisma.product.findMany({ include: { category: true } });
  for (const p of allProducts) {
    if (!p.image || p.image.includes('unsplash.com')) {
      const cat = p.category ? p.category.name.toLowerCase() : '';
      let fallbackImg = '/images/products/shipra_prod_teak_table.png';
      
      if (cat.includes('furniture')) {
        fallbackImg = '/images/products/shipra_prod_nordic_sofa.png';
      } else if (cat.includes('appliance')) {
        fallbackImg = '/images/products/shipra_prod_air_purifier.png';
      } else if (cat.includes('shirt') || cat.includes('men') || cat.includes('clothes')) {
        fallbackImg = '/images/products/shipra_prod_oxford_shirt.png';
      } else if (cat.includes('tank') || cat.includes('women')) {
        fallbackImg = '/images/products/shipra_prod_ribbed_tank.png';
      } else if (cat.includes('skincare') || cat.includes('sun') || cat.includes('moistur') || cat.includes('serum')) {
        fallbackImg = '/images/products/shipra_prod_air_purifier.png';
      }

      await prisma.product.update({
        where: { id: p.id },
        data: { image: fallbackImg, images: [fallbackImg] }
      });
      console.log(`Updated product "${p.title}" with image ${fallbackImg}`);
    }
  }

  console.log('Product image configuration completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
