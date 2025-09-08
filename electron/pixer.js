const sharp = require('sharp');
const net = require('net');
const fs = require('fs');

const WIDTH = 1872;
const HEIGHT = 1404;
const HEADER = Buffer.from('#file#000801314144imagebin');

async function convertImage(imagePath) {
  const buffer = await sharp(imagePath)
    .resize(WIDTH, HEIGHT, { fit: 'cover' })
    .grayscale()
    .raw()
    .toBuffer();

  const packed = Buffer.alloc((WIDTH * HEIGHT) / 2);
  for (let i = 0; i < buffer.length; i += 2) {
    const high = buffer[i] >> 4;
    const low = buffer[i + 1] >> 4;
    packed[i / 2] = (high << 4) | low;
  }
  return Buffer.concat([HEADER, packed]);
}

function upload(host, port, data) {
  return new Promise((resolve, reject) => {
    const client = net.connect({ host, port }, () => {
      client.write(data);
      client.end();
    });
    client.on('error', reject);
    client.on('close', resolve);
  });
}

async function convertAndUpload(imagePath, host = '192.168.1.1', port = 6000) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`找不到圖片檔案: ${imagePath}`);
  }
  const data = await convertImage(imagePath);
  await upload(host, port, data);
}

module.exports = { convertAndUpload };
