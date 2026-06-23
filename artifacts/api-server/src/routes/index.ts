import { Router, type IRouter } from "express";
import healthRouter from "./health";
import booksRouter from "./books";
import storageRouter from "./storage";
import holidayInsightsRouter from "./holidayInsights";
import parshaInsightsRouter from "./parshaInsights";
import pushRouter from "./push";
import userRouter from "./user";
import communityYahrzeitRouter from "./communityYahrzeit";
import censusRouter from "./census";
import announcementsRouter from "./announcements";
import paymentsRouter from "./payments";
import calendarRouter from "./calendar";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(booksRouter);
router.use(storageRouter);
router.use(holidayInsightsRouter);
router.use(parshaInsightsRouter);
router.use(pushRouter);
router.use(userRouter);
router.use("/community", communityYahrzeitRouter);
router.use(censusRouter);
router.use(announcementsRouter);
router.use(paymentsRouter);
router.use(calendarRouter);
router.use(chatRouter);

export default router;
