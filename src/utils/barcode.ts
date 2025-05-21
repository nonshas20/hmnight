// Import JsBarcode dynamically to avoid SSR issues
let JsBarcode: any = null;

export function generateBarcodeValue(): string {
  // Generate a random 12-digit number for the barcode
  const randomNum = Math.floor(100000000000 + Math.random() * 900000000000);
  return randomNum.toString();
}

export async function generateBarcodeDataUrl(value: string): Promise<string> {
  return new Promise(async (resolve) => {
    // Dynamically import JsBarcode only on client side
    if (!JsBarcode && typeof window !== 'undefined') {
      JsBarcode = (await import('jsbarcode')).default;
    }

    if (!JsBarcode) {
      console.error('JsBarcode not available');
      resolve('');
      return;
    }

    // Create a canvas for the horizontal barcode first
    const horizontalCanvas = document.createElement('canvas');
    JsBarcode(horizontalCanvas, value, {
      format: 'CODE128',
      lineColor: '#E6C068', // Exact gold color extracted from the image you shared
      width: 2,             // Even thinner bars for a narrower barcode
      height: 210,          // Further increased height for an even taller barcode after rotation
      displayValue: false,  // No numbers below
      margin: 0,            // No margin
      background: '#000000' // Black background
    });

    // Now create a new canvas to rotate the barcode to vertical orientation
    const verticalCanvas = document.createElement('canvas');
    const horizontalWidth = horizontalCanvas.width;
    const horizontalHeight = horizontalCanvas.height;

    // Swap width and height for vertical orientation
    verticalCanvas.width = horizontalHeight;
    verticalCanvas.height = horizontalWidth;

    const ctx = verticalCanvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      resolve('');
      return;
    }

    // Rotate and draw the barcode
    ctx.save();
    ctx.fillStyle = '#000000'; // Ensure black background
    ctx.fillRect(0, 0, verticalCanvas.width, verticalCanvas.height);
    ctx.translate(verticalCanvas.width, 0);
    ctx.rotate(Math.PI / 2); // 90 degrees rotation
    ctx.drawImage(horizontalCanvas, 0, 0);
    ctx.restore();

    resolve(verticalCanvas.toDataURL('image/png'));
  });
}

export function generateTicketWithBarcode(
  student: { name: string; email: string; barcode: string },
  barcodeDataUrl: string,
  templateUrl: string = '/assets/img/hmgalaticket.png'
): Promise<string> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.error('Cannot generate ticket in server-side environment');
    return Promise.resolve('');
  }

  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error('Could not get canvas context');
        resolve('');
        return;
      }

      // Load the ticket template
      const ticketImg = new Image();
      ticketImg.crossOrigin = 'anonymous'; // To avoid CORS issues

      ticketImg.onload = () => {
        try {
          // Set canvas dimensions to match the ticket image
          canvas.width = ticketImg.width;
          canvas.height = ticketImg.height;

          // Draw the ticket template
          ctx.drawImage(ticketImg, 0, 0, canvas.width, canvas.height);

          // Load and draw the barcode
          const barcodeImg = new Image();
          barcodeImg.onload = () => {
            try {
              // Calculate barcode position for vertical orientation on the right side of the ticket
              // Position it to match the ticket design in the image you shared
              const barcodeWidth = canvas.width * 0.035;  // 3.5% of ticket width (even narrower)
              const barcodeHeight = canvas.height * 0.7;  // 70% of ticket height (even taller)
              const barcodeX = canvas.width * 0.9;        // 90% from left (much further right)
              const barcodeY = canvas.height * 0.15;      // 15% from top (higher placement)

              // Draw the barcode at the calculated position
              ctx.drawImage(
                barcodeImg,
                barcodeX,
                barcodeY,
                barcodeWidth,
                barcodeHeight
              );

              // Return the composite image as data URL
              resolve(canvas.toDataURL('image/png'));
            } catch (e) {
              console.error('Error drawing barcode on ticket:', e);
              resolve('');
            }
          };

          barcodeImg.onerror = () => {
            console.error('Failed to load barcode image');
            resolve('');
          };

          barcodeImg.src = barcodeDataUrl;
        } catch (e) {
          console.error('Error drawing ticket template:', e);
          resolve('');
        }
      };

      ticketImg.onerror = () => {
        console.error('Failed to load ticket template image');
        resolve('');
      };

      // Load the ticket template image
      ticketImg.src = templateUrl;
    } catch (e) {
      console.error('Error in generateTicketWithBarcode:', e);
      resolve('');
    }
  });
}

// Polyfill for roundRect if not available
if (typeof window !== 'undefined' && typeof CanvasRenderingContext2D !== 'undefined') {
  // Check if roundRect is not available
  if (!('roundRect' in CanvasRenderingContext2D.prototype)) {
    // Use type assertion to add the method safely
    (CanvasRenderingContext2D.prototype as any).roundRect = function(
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number
    ): CanvasRenderingContext2D {
      // Ensure radius is a number and handle edge cases
      const r = radius || 0;

      if (width < 2 * r) {
        const newRadius = width / 2;
        this.beginPath();
        this.moveTo(x + newRadius, y);
        this.arcTo(x + width, y, x + width, y + height, newRadius);
        this.arcTo(x + width, y + height, x, y + height, newRadius);
        this.arcTo(x, y + height, x, y, newRadius);
        this.arcTo(x, y, x + width, y, newRadius);
        this.closePath();
        return this;
      }

      if (height < 2 * r) {
        const newRadius = height / 2;
        this.beginPath();
        this.moveTo(x + newRadius, y);
        this.arcTo(x + width, y, x + width, y + height, newRadius);
        this.arcTo(x + width, y + height, x, y + height, newRadius);
        this.arcTo(x, y + height, x, y, newRadius);
        this.arcTo(x, y, x + width, y, newRadius);
        this.closePath();
        return this;
      }

      this.beginPath();
      this.moveTo(x + r, y);
      this.arcTo(x + width, y, x + width, y + height, r);
      this.arcTo(x + width, y + height, x, y + height, r);
      this.arcTo(x, y + height, x, y, r);
      this.arcTo(x, y, x + width, y, r);
      this.closePath();
      return this;
    };
  }
}
