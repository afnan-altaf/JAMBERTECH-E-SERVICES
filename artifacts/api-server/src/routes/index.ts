// Routes index - saare sub-routers yahan register karte hain
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import providersRouter from "./providers";
import servicesRouter from "./services";
import ordersRouter from "./orders";

const router: IRouter = Router();

// Saare routes mount karo
router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(providersRouter);
router.use(servicesRouter);
router.use(ordersRouter);

export default router;
