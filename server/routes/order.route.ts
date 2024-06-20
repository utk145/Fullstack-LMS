import { Router } from "express";
import { authorizeRoles, verifyJWT } from "../middleware/auth.middleware";
import { createOrder, getAllOrdersForAdmin } from "../controllers/order.controller";

const router = Router();

router.route("/create-order").post(verifyJWT, createOrder);
router.route("/get-all-orders-for-admin").get(verifyJWT, authorizeRoles("admin"), getAllOrdersForAdmin);

export default router;