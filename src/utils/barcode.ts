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

    // Create a canvas for the horizontal barcode first with optimized settings for scanning
    const horizontalCanvas = document.createElement('canvas');
    JsBarcode(horizontalCanvas, value, {
      format: 'CODE128',
      lineColor: '#E6C068', // Gold color for design
      width: 6,             // Much wider bars for excellent scanning reliability
      height: 150,          // Increased height for better scanning
      displayValue: false,  // No numbers below
      margin: 20,           // Larger margin for better scanning
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

// Generate a horizontal barcode for better scanning compatibility
export async function generateHorizontalBarcodeDataUrl(value: string): Promise<string> {
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

    // Create a horizontal barcode optimized for scanning
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, {
      format: 'CODE128',
      lineColor: '#E6C068', // Gold color for design
      width: 6,             // Wide bars for excellent scanning
      height: 80,           // Good height for horizontal scanning
      displayValue: false,  // No numbers below
      margin: 20,           // Large margin for better scanning
      background: '#000000' // Black background
    });

    resolve(canvas.toDataURL('image/png'));
  });
}

export function generateTicketWithBarcode(
  student: { name: string; email: string; barcode: string; table_number?: string; seat_number?: string },
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
              // Make the barcode much larger and more prominent
              const barcodeWidth = canvas.width * 0.08;   // 8% of ticket width (much wider)
              const barcodeHeight = canvas.height * 0.8;  // 80% of ticket height (taller)
              const barcodeX = canvas.width * 0.88;       // 88% from left (positioned for visibility)
              const barcodeY = canvas.height * 0.1;       // 10% from top (centered vertically)

              // Draw table and seat information vertically to the left of the barcode
              if (student.table_number || student.seat_number) {
                // Save the current context state
                ctx.save();

                // Set font properties for the vertical text
                ctx.fillStyle = '#E6C068'; // Gold color to match barcode
                ctx.font = 'italic 40px Arial';
                ctx.textAlign = 'center';

                // Calculate position to the left of the barcode
                const textX = barcodeX - 30; // 30px to the left of barcode
                const centerY = barcodeY + (barcodeHeight / 2); // Center vertically with barcode

                // Rotate the context for vertical text (90 degrees counterclockwise)
                ctx.translate(textX, centerY);
                ctx.rotate(-Math.PI / 2);

                // Draw table and seat info vertically
                let textOffset = 0;
                if (student.table_number && student.seat_number) {
                  // Both table and seat - draw them with separator
                  ctx.fillText(`TABLE: ${student.table_number} | SEAT: ${student.seat_number}`, 0, textOffset);
                } else if (student.table_number) {
                  // Only table number
                  ctx.fillText(`TABLE: ${student.table_number}`, 0, textOffset);
                } else if (student.seat_number) {
                  // Only seat number
                  ctx.fillText(`SEAT: ${student.seat_number}`, 0, textOffset);
                }

                // Restore the context state
                ctx.restore();
              }

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

      // Load the ticket template image with cache busting
      ticketImg.src = templateUrl + '?v=' + Date.now();
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
