import { VirtualTryOnProvider, VirtualTryOnInput, VirtualTryOnProviderResult } from '../types';

export class MockTryOnProvider implements VirtualTryOnProvider {
  name = 'Development Mock Provider (Dev Only)';

  async generateTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnProviderResult> {
    const startTime = Date.now();
    console.log(`[MockTryOnProvider] Processing try-on for product: ${input.productId || 'unknown'}, type: ${input.jewelleryType}`);

    // Simulate realistic AI generation latency (1.2s)
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Convert input user image to String
    let userImgSrc = typeof input.userImage === 'string' ? input.userImage : '';
    if (Buffer.isBuffer(input.userImage)) {
      userImgSrc = `data:image/jpeg;base64,${input.userImage.toString('base64')}`;
    }

    let productImgSrc = typeof input.productImage === 'string' ? input.productImage : '';
    if (Buffer.isBuffer(input.productImage)) {
      productImgSrc = `data:image/png;base64,${input.productImage.toString('base64')}`;
    }

    if (!userImgSrc) {
      return {
        imageUrl: productImgSrc,
        processingTimeMs: Date.now() - startTime,
        providerName: this.name
      };
    }

    if (!productImgSrc) {
      return {
        imageUrl: userImgSrc,
        processingTimeMs: Date.now() - startTime,
        providerName: this.name
      };
    }

    // Default target proportions & positions for mock rendering overlay
    let productOverlay = '';
    const type = input.jewelleryType;

    if (type === 'WATCH') {
      // Place watch on the wrist area (lower portion of torso/arms)
      productOverlay = `
        <filter id="watch-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
        <g transform="translate(240, 480) rotate(-10 60 60)">
          <image href="${productImgSrc}" x="0" y="0" width="120" height="120" filter="url(#watch-shadow)" preserveAspectRatio="xMidYMid meet" />
        </g>
      `;
    } else if (type === 'BRACELET') {
      productOverlay = `
        <filter id="bracelet-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.5"/>
        </filter>
        <g transform="translate(230, 490) rotate(-8 65 65)">
          <image href="${productImgSrc}" x="0" y="0" width="130" height="130" filter="url(#bracelet-shadow)" preserveAspectRatio="xMidYMid meet" />
        </g>
      `;
    } else if (type === 'NECKLACE') {
      productOverlay = `
        <filter id="necklace-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.4"/>
        </filter>
        <g transform="translate(190, 310)">
          <image href="${productImgSrc}" x="0" y="0" width="220" height="220" filter="url(#necklace-shadow)" preserveAspectRatio="xMidYMid meet" />
        </g>
      `;
    } else if (type === 'EARRINGS') {
      productOverlay = `
        <filter id="earring-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="1" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
        </filter>
        <g transform="translate(200, 240)">
          <image href="${productImgSrc}" x="0" y="0" width="45" height="45" filter="url(#earring-shadow)" preserveAspectRatio="xMidYMid meet" />
        </g>
        <g transform="translate(355, 240)">
          <image href="${productImgSrc}" x="0" y="0" width="45" height="45" filter="url(#earring-shadow)" preserveAspectRatio="xMidYMid meet" />
        </g>
      `;
    } else if (type === 'RING') {
      productOverlay = `
        <filter id="ring-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
        </filter>
        <g transform="translate(270, 460)">
          <image href="${productImgSrc}" x="0" y="0" width="60" height="60" filter="url(#ring-shadow)" preserveAspectRatio="xMidYMid meet" />
        </g>
      `;
    } else {
      productOverlay = `
        <g transform="translate(240, 480)">
          <image href="${productImgSrc}" x="0" y="0" width="120" height="120" preserveAspectRatio="xMidYMid meet" />
        </g>
      `;
    }

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 600 750" width="100%" height="100%">
        <image href="${userImgSrc}" x="0" y="0" width="600" height="750" preserveAspectRatio="xMidYMid slice" />
        ${productOverlay}
      </svg>
    `.trim();

    const svgBase64 = Buffer.from(svgString).toString('base64');
    const finalImageUrl = `data:image/svg+xml;base64,${svgBase64}`;

    return {
      imageUrl: finalImageUrl,
      processingTimeMs: Date.now() - startTime,
      providerName: this.name
    };
  }
}

