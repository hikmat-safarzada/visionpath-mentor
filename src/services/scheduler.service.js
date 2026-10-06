const cron = require("node-cron");
const Goal = require("../models/Goal");
const User = require("../models/User");
const { getLocalDate, getLocalTime } = require("../utils/time");
const { Bot } = require("node-telegram-bot-api");
const goalService = require("./goal.service");
const mentorService = require("./mentor.service");

const displayCategory = (name = "") => name.replace(/[\uE000-\uF8FF]/gu, "").trim();

const runGoalReminders = async (bot, date = new Date()) => {
  const goals = await Goal.find({active:true, reminderTime:{$ne:null}}).populate("user_id");
  for (const goal of goals) {
    const user=goal.user_id; if(!user) continue;
    if(getLocalTime(user.timezone,date)!==goal.reminderTime) continue;
    const day=getLocalDate(user.timezone,date); if(goal.lastReminderDate===day) continue;
    await bot.api.sendMessage({chat_id:user.chatId,text:`⏰ ${goal.title}\n\nBugünkü kiçik addımını tamamla.`,reply_markup:{inline_keyboard:[[{text:"✅ Tamamladım",callback_data:`STEP:${goal._id}:daily:${goal.dailySteps.find(s=>s.selected&&!s.completed)?._id||goal.dailySteps[0]?._id}`}]]}});
    goal.lastReminderDate=day; await goal.save();
  }
};

const runWeeklyCheckins = async (bot,date=new Date()) => {
  const localDay=date.getDay(); if(localDay!==1) return;
  const users=await User.find({onboardingState:"done"});
  for(const user of users){
    const goals=await goalService.activeGoals(user._id); if(!goals.length) continue;
    await bot.api.sendMessage({chat_id:user.chatId,text:"📊 Həftəlik check-in vaxtıdır!\nBu həftə hədəflərin üçün nə etdin?",reply_markup:{inline_keyboard:goals.map(g=>[{text:g.title,callback_data:`CIGOAL:${g._id}`}])}});
  }
};
const runMentorPushes = async (bot, date = new Date()) => {
  const preferences = await mentorService.getDuePreferences(date);
  for (const preference of preferences) {
    try {
      const result = await mentorService.createDailyDelivery(preference, preference.user_id, date);
      if (result.alreadySent || !result.delivery) continue;
      const delivery = result.delivery;
      const category = displayCategory(preference.category_id?.name);
      const subcategory = preference.subcategory_id?.name || "Seçilmiş subkateqoriya";
      await bot.api.sendMessage({
        chat_id: preference.user_id.chatId,
        text: `${category ? `${category}\n` : ""}↳ ${subcategory}\n\n🧭 Mentor qeydi:\n\n${delivery.message_id.text}\n\n❤️ Bəyəndikdə yalnız bu subkateqoriyanın progressi 5% artır.`,
        reply_markup: { inline_keyboard: [[
          { text: "❤️ Bəyəndim", callback_data: `MA:${delivery._id}:LIKE` },
          { text: "🔄 Digər qeyd", callback_data: `MA:${delivery._id}:OTHER` }
        ]] }
      });
    } catch (error) {
      // One incomplete content stream must not stop other users' scheduled pushes.
      console.error("Mentor push failed:", error.message);
    }
  }
};
const runDuePushes = async(bot,date=new Date())=>{ await runGoalReminders(bot,date); await runMentorPushes(bot,date); await runWeeklyCheckins(bot,date); };
const startScheduler = bot => cron.schedule("* * * * *",()=>runDuePushes(bot),{noOverlap:true});
module.exports={runDuePushes,runGoalReminders,runMentorPushes,startScheduler};
