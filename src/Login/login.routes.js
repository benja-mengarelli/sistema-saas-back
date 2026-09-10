import {Router} from 'express';
import { logout, register, login } from '../controllers/api/login.controller.js';
import passport from '../../config/passport.config.js';


const router = Router();

router.post("/registrarse", passport.authenticate('register', { session: false }), register);
router.post("/ingresar", passport.authenticate('login', { session: false }), login);
router.post("/logout", logout);

export default router;