import { Router } from "express";
import { activateUser, loginUser, registerUser } from "../controllers/user.controller";

const router = Router();

router.route('/register').post(registerUser);
router.route('/activate-user').post(activateUser);
router.route("/login").post(loginUser);

export default router;