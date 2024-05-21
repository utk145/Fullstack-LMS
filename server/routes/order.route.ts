import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware";
import { createOrder } from "../controllers/order.controller";

const router = Router();

router.route("/create-order").post(verifyJWT, createOrder);

export default router;