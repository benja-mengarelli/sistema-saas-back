import {Router} from 'express';
import { logout, register, login } from './login.controller.js';


const router = Router();

router.post("/registrarse", register);
router.post("/ingresar", login);
router.post("/logout", logout);

export default router;