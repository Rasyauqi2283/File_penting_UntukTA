// routes/userRoutes.js
import express from 'express';
import {
  generateUserIdHandler,
  assignUserIdHandler
} from './userController.js';

const router = express.Router();

router.post('/generate-userid', generateUserIdHandler);
router.post('/assign-userid-and-divisi', assignUserIdHandler);

export default router;