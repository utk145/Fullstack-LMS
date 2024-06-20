import { Router } from "express";
import { activateUser, changeCurrentPassword, getAllUsersForAdmin, getUserInfo, loginUser, logoutUser, registerUser, socialAuth, updateAccessToken, updateUserAvatar, updateUserNameEmailInfo, updateUserRole } from "../controllers/user.controller";
import { authorizeRoles, verifyJWT } from "../middleware/auth.middleware";

const router = Router();

router.route('/register').post(registerUser);
router.route('/activate-user').post(activateUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(updateAccessToken);
router.route("/getUserInfo").get(verifyJWT, getUserInfo);
router.route("/social-auth").post(socialAuth);
router.route("/update-email-name-info").post(verifyJWT, updateUserNameEmailInfo);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/update-avatar").post(verifyJWT, updateUserAvatar);
router.route("/get-all-users-for-admin").get(verifyJWT, authorizeRoles("admin"), getAllUsersForAdmin);
router.route("/update-role").post(verifyJWT, authorizeRoles("admin"), updateUserRole);

export default router;