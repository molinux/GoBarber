import jwt from 'jsonwebtoken';
import { promisify } from 'util';

// Onde está o secret do token
// para descriptografar e ver se está válido
import authConfig from '../../config/auth';

/*
 Verifica se o usuário está autenticado
 através do token que vai no Header da aplicação
*/
export default async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  // CUT no token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6
  // [bearer, token]
  const [, token] = authHeader.split(' ');

  try {
    // assíncrono tem performance melhor,
    // mas utiliza método callback (pior que async/await)
    // promisify = transforma função callback em async/await
    const decoded = await promisify(jwt.verify)(token, authConfig.secret);

    // id do usuario vai estar dentro do decoded
    req.userId = decoded.id;

    // Para continuar executando e evitar o loop infinito
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid' });
  }
};
