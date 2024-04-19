import { Router } from "express";
import { activateUser, loginUser, logoutUser, registerUser, updateAccessToken } from "../controllers/user.controller";
import { verifyJWT } from "../middleware/auth.middleware";

const router = Router();

router.route('/register').post(registerUser);
router.route('/activate-user').post(activateUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(updateAccessToken);

export default router;