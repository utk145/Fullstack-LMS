import { Router } from "express";
import { activateUser, getUserInfo, loginUser, logoutUser, registerUser, socialAuth, updateAccessToken } from "../controllers/user.controller";
import { verifyJWT } from "../middleware/auth.middleware";

const router = Router();

router.route('/register').post(registerUser);
router.route('/activate-user').post(activateUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(updateAccessToken);
router.route("/getUserInfo").get(verifyJWT, getUserInfo);
router.route("/social-auth").post(socialAuth);

export default router;