const AIChatSession = require("../models/AIChatSession");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");
const TestAttempt = require("../models/TestAttempt");
const User = require("../models/User");

const deleteUserCascade = async (userId) => {
  const user = await User.findById(userId).select("_id");
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const [attemptResult, paymentResult, chatResult] = await Promise.all([
    TestAttempt.deleteMany({ userId }),
    Payment.deleteMany({ userId }),
    AIChatSession.deleteMany({ userId }),
  ]);

  await Notification.updateMany({ createdBy: userId }, { $unset: { createdBy: "" } });
  await User.findByIdAndDelete(userId);

  return {
    deletedUserId: String(userId),
    deletedAttempts: attemptResult.deletedCount || 0,
    deletedPayments: paymentResult.deletedCount || 0,
    deletedAiChatSessions: chatResult.deletedCount || 0,
  };
};

module.exports = {
  deleteUserCascade,
};
