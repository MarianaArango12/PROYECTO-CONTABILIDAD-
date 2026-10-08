import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/prueba', (req, res) => {
  res.json({
    mensaje: 'APP.TS ESTA FUNCIONANDO'
  });
});

app.use('/api', routes);

export default app;