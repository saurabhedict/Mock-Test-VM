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

const deleteUsersCascade = async (userIds = []) => {
  const uniqueUserIds = [...new Set(userIds.map((value) => String(value)).filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    const error = new Error("At least one user must be selected");
    error.status = 400;
    throw error;
  }

  const summaries = [];

  for (const userId of uniqueUserIds) {
    summaries.push(await deleteUserCascade(userId));
  }

  return {
    deletedCount: summaries.length,
    deletedUserIds: summaries.map((summary) => summary.deletedUserId),
    deletedAttempts: summaries.reduce((total, summary) => total + (summary.deletedAttempts || 0), 0),
    deletedPayments: summaries.reduce((total, summary) => total + (summary.deletedPayments || 0), 0),
    deletedAiChatSessions: summaries.reduce((total, summary) => total + (summary.deletedAiChatSessions || 0), 0),
    summaries,
  };
};

module.exports = {
  deleteUserCascade,
  deleteUsersCascade,
};
