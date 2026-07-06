const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'bfvtb4xp',
  api_key: '455851493531962',
  api_secret: '3-sWr7_Z2mAFZR-mPLrheTVymPg',
  secure: true,
});

async function main() {
  try {
    console.log('Testing Cloudinary connection...\n');
    
    // Simple ping test first
    const result = await cloudinary.api.ping();
    console.log('Ping result:', JSON.stringify(result, null, 2));
    
    console.log('\n📤 Uploading demo image...\n');
    
    const uploadResult = await cloudinary.uploader.upload(
      'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      {
        public_id: 'onboarding_test',
        folder: 'jb-products',
      }
    );

    console.log('✅ Upload berhasil!');
    console.log(`   Secure URL : ${uploadResult.secure_url}`);
    console.log(`   Public ID  : ${uploadResult.public_id}\n`);

    // Get details
    const details = await cloudinary.api.resource(uploadResult.public_id);
    console.log('✅ Image details:');
    console.log(`   Width      : ${details.width}px`);
    console.log(`   Height     : ${details.height}px`);
    console.log(`   Format     : ${details.format}`);
    console.log(`   File size  : ${details.bytes} bytes (${(details.bytes / 1024).toFixed(1)} KB)\n`);

    // Transform
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    console.log('🎉 Done! Click link below to see optimized version.');
    console.log('   f_auto → picks best format (WebP/AVIF)');
    console.log('   q_auto → optimizes quality for smallest size\n');
    console.log(`   ${transformedUrl}\n`);

  } catch (error) {
    console.error('❌ Error details:');
    console.error('   Message:', error.message);
    console.error('   Name:', error.name);
    console.error('   HTTP code:', error.http_code);
    console.error('   Full error:', JSON.stringify(error, null, 2));
  }
}

main();
