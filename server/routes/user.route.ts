import { Router } from "express";
import { activateUser, loginUser, logoutUser, registerUser } from "../controllers/user.controller";
import { verifyJWT } from "../middleware/auth.middleware";

const router = Router();

router.route('/register').post(registerUser);
router.route('/activate-user').post(activateUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);

export default router;