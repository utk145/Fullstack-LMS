import { Router } from "express";
import { activateUser, registerUser } from "../controllers/user.controller";

const router = Router();

router.route('/register').post(registerUser);
router.route('/activate-user').post(activateUser);


export default router;