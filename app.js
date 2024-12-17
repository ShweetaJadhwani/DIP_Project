document.addEventListener('DOMContentLoaded', () => {
  let originalImage = null; // Declare once
  const originalCanvas = document.getElementById('originalCanvas');
  const processedCanvas = document.getElementById('processedCanvas');
  const originalCtx = originalCanvas.getContext('2d');
  const processedCtx = processedCanvas.getContext('2d');
  const subFilterSelect = document.getElementById('subFilterSelect');

  const subFilters = {
      gammaCorrection: ["Gamma = 0.5", "Gamma = 1.0", "Gamma = 2.2"],
      bitPlaneSlicing: ["Plane 0", "Plane 1", "Plane 7"],
      affineTransform: ["Rotate 45°", "Scale 2x", "Translate (50, 50)"],
      histogramEqualization: ["Default"],
      imageInterpolation: ["Scale 2x", "Scale 0.5x", "Nearest Neighbor"],
  };

  function populateSubFilters(algorithm) {
      subFilterSelect.innerHTML = '';
      subFilters[algorithm].forEach((filter, index) => {
          const option = document.createElement('option');
          option.value = index;
          option.textContent = filter;
          subFilterSelect.appendChild(option);
      });
  }

  document.getElementById('algorithmSelect').addEventListener('change', (event) => {
      populateSubFilters(event.target.value);
  });

  // Initialize subfilters
  populateSubFilters('gammaCorrection');

  document.getElementById('fileInput').addEventListener('change', (event) => {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = function (e) {
          const img = new Image();
          img.onload = function () {
              originalCanvas.width = img.width;
              originalCanvas.height = img.height;
              originalCtx.drawImage(img, 0, 0);
              originalImage = img;
          };
          img.src = e.target.result;
      };

      reader.readAsDataURL(file);
  });

  document.getElementById('processBtn').addEventListener('click', () => {
      if (!originalImage) {
          alert('Please upload an image first!');
          return;
      }

      const algorithm = document.getElementById('algorithmSelect').value;
      const subFilter = parseInt(subFilterSelect.value, 10);

      switch (algorithm) {
          case 'gammaCorrection':
              applyGammaCorrection(subFilter);
              break;
          case 'bitPlaneSlicing':
              applyBitPlaneSlicing(subFilter);
              break;
          case 'affineTransform':
              applyAffineTransform(subFilter);
              break;
          case 'histogramEqualization':
              applyHistogramEqualization();
              break;
          case 'imageInterpolation':
              applyImageInterpolation(subFilter);
              break;
      }
  });

  function applyGammaCorrection(subFilter) {
      const gammaValues = [0.5, 1.0, 2.2];
      const gamma = gammaValues[subFilter];
      const imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
          for (let j = 0; j < 3; j++) {
              data[i + j] = 255 * Math.pow(data[i + j] / 255, gamma);
          }
      }

      processedCanvas.width = originalCanvas.width;
      processedCanvas.height = originalCanvas.height;
      processedCtx.putImageData(imageData, 0, 0);
  }

  function applyBitPlaneSlicing(subFilter) {
      const bitPlane = 1 << subFilter;
      const imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
      const data = imageData.data;

      const newImageData = processedCtx.createImageData(originalCanvas.width, originalCanvas.height);
      const newData = newImageData.data;

      for (let i = 0; i < data.length; i += 4) {
          for (let j = 0; j < 3; j++) {
              newData[i + j] = data[i + j] & bitPlane ? 255 : 0;
          }
          newData[i + 3] = 255; // Alpha channel
      }

      processedCanvas.width = originalCanvas.width;
      processedCanvas.height = originalCanvas.height;
      processedCtx.putImageData(newImageData, 0, 0);
  }

  function applyAffineTransform(subFilter) {
      const transforms = [
          { type: 'rotate', angle: Math.PI / 4 },
          { type: 'scale', factor: 2 },
          { type: 'translate', x: 50, y: 50 },
      ];

      const transform = transforms[subFilter];
      const imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
      const data = imageData.data;

      processedCanvas.width = originalCanvas.width;
      processedCanvas.height = originalCanvas.height;
      const newImageData = processedCtx.createImageData(processedCanvas.width, processedCanvas.height);

      for (let y = 0; y < originalCanvas.height; y++) {
          for (let x = 0; x < originalCanvas.width; x++) {
              let srcX = x, srcY = y;

              if (transform.type === 'rotate') {
                  srcX = Math.cos(transform.angle) * x - Math.sin(transform.angle) * y;
                  srcY = Math.sin(transform.angle) * x + Math.cos(transform.angle) * y;
              } else if (transform.type === 'scale') {
                  srcX = x / transform.factor;
                  srcY = y / transform.factor;
              } else if (transform.type === 'translate') {
                  srcX = x - transform.x;
                  srcY = y - transform.y;
              }

              srcX = Math.round(srcX);
              srcY = Math.round(srcY);

              if (srcX >= 0 && srcX < originalCanvas.width && srcY >= 0 && srcY < originalCanvas.height) {
                  const srcIndex = (srcY * originalCanvas.width + srcX) * 4;
                  const destIndex = (y * originalCanvas.width + x) * 4;

                  for (let i = 0; i < 4; i++) {
                      newImageData.data[destIndex + i] = data[srcIndex + i];
                  }
              }
          }
      }

      processedCtx.putImageData(newImageData, 0, 0);
  }

  function applyHistogramEqualization() {
      const imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
      const data = imageData.data;

      const histogram = new Array(256).fill(0);

      for (let i = 0; i < data.length; i += 4) {
          const brightness = Math.round(0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]);
          histogram[brightness]++;
      }

      const cdf = histogram.reduce((acc, val, idx) => {
          acc[idx] = val + (acc[idx - 1] || 0);
          return acc;
      }, []);

      const cdfMin = cdf.find((value) => value > 0);
      const cdfScale = 255 / (cdf[cdf.length - 1] - cdfMin);

      for (let i = 0; i < data.length; i += 4) {
          const brightness = Math.round(0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]);
          const equalizedValue = Math.round((cdf[brightness] - cdfMin) * cdfScale);
          data[i] = data[i + 1] = data[i + 2] = equalizedValue;
      }

      processedCanvas.width = originalCanvas.width;
      processedCanvas.height = originalCanvas.height;
      processedCtx.putImageData(imageData, 0, 0);
  }

  function applyImageInterpolation(subFilter) {
      const scaleFactors = [2, 0.5, 1];
      const scale = scaleFactors[subFilter];
      const imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
      const data = imageData.data;

      processedCanvas.width = originalCanvas.width * scale;
      processedCanvas.height = originalCanvas.height * scale;

      const newImageData = processedCtx.createImageData(processedCanvas.width, processedCanvas.height);

      for (let y = 0; y < processedCanvas.height; y++) {
          for (let x = 0; x < processedCanvas.width; x++) {
              const srcX = Math.floor(x / scale);
              const srcY = Math.floor(y / scale);

              const srcIndex = (srcY * originalCanvas.width + srcX) * 4;
              const destIndex = (y * processedCanvas.width + x) * 4;

              for (let i = 0; i < 4; i++) {
                  newImageData.data[destIndex + i] = data[srcIndex + i];
              }
          }
      }

      processedCtx.putImageData(newImageData, 0, 0);
  }
});
