import jwt from 'jsonwebtoken';

export function verificarToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Token no proporcionado'
      });
    }

    const partes = authHeader.split(' ');

    if (
      partes.length !== 2 ||
      partes[0] !== 'Bearer' ||
      !partes[1]
    ) {
      return res.status(401).json({
        error: 'Formato de token inválido'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error(
        'JWT_SECRET no está configurado en las variables de entorno'
      );

      return res.status(500).json({
        error: 'Error de configuración del servidor'
      });
    }

    const token = partes[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.usuario = decoded;

    next();
  } catch (error) {
    console.error('Error al verificar token:', error.message);

    return res.status(401).json({
      error: 'Token inválido o expirado'
    });
  }
}

