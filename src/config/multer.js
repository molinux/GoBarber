import multer from 'multer';
import crypto from 'crypto';
// extname = qual a extensao do arquivo
// resolve = percorrer o caminho dentro do app
import { extname, resolve } from 'path';

export default {
  // Como o multer vai armazenar os arquivos
  // Aceita Amanzon S3, Digital Spaces, etc.
  storage: multer.diskStorage({
    destination: resolve(__dirname, '..', '..', 'tmp', 'uploads'),
    // cb = callback
    filename: (req, file, cb) => {
      crypto.randomBytes(16, (err, res) => {
        if (err) return cb(err);

        return cb(null, res.toString('hex') + extname(file.originalname));
      });
    },
  }),
};
