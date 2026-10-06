const goalService = require("../services/goal.service");
const getGoals = async (req,res)=>{ try { const user=await goalService.getUser(req.query.telegramId); if(!user) return res.status(404).json({message:"User not found"}); const goals=await goalService.activeGoals(user._id); return res.json({goals}); } catch(e){ return res.status(500).json({message:e.message}); } };
module.exports={getGoals};
