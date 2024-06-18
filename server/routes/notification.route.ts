import { Router } from "express";
import { authorizeRoles, verifyJWT } from "../middleware/auth.middleware";
import { getAllNotifications, updateNotificationStatus } from "../controllers/notification.controller";

const router = Router();

router.route("/get-all-notifications").get(verifyJWT, authorizeRoles("admin"), getAllNotifications);
router.route("/update-notification-status/:id").post(verifyJWT, authorizeRoles("admin"), updateNotificationStatus);

export default router;