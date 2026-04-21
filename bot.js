require("dotenv").config();
const path = require("path");
const { Telegraf, Markup } = require("telegraf");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const bot = new Telegraf(process.env.BOT_TOKEN);
const CHANNEL_ID = process.env.CHANNEL_ID;
const WEB_APP_URL = process.env.WEB_APP_URL;

const checkSubscription = async (ctx) => {
  try {
    const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
    return ["creator", "administrator", "member"].includes(member.status);
  } catch (e) {
    return false;
  }
};

bot.start(async (ctx) => {
  const name = ctx.from.first_name || "Friend";
  const imagePath = path.join(__dirname, "images", "engflix.jpg");

  await ctx.replyWithPhoto(
    { source: imagePath },
    {
      caption: `Hello ${name}! 👋\n\nWelcome to @EngflixMovieBot!\n\nPlease send me your special ID code 🚀`,
      parse_mode: "Markdown",
    },
  );
});

bot.on("text", async (ctx) => {
  const isSubscribed = await checkSubscription(ctx);

  if (!isSubscribed) {
    return ctx.reply(
      "Please join our official channel",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "📢 Subscribe",
            `https://t.me/${CHANNEL_ID.replace("@", "")}`,
          ),
        ],
        [Markup.button.callback("✅ I've Subscribed", "check_sub")],
      ]),
    );
  }

  try {
    const input = ctx.message.text.trim();

    const { data: movie, error } = await supabase
      .from("movies")
      .select("*")
      .eq("tmdb_id", input)
      .maybeSingle();

    if (movie) {
      await ctx.replyWithChatAction("typing");

      const movieUrl = `${WEB_APP_URL}/watch/${movie.tmdb_id}`;

      ctx.reply(
        `🎬 Title: ${movie.name || "Movie"}`,
        Markup.inlineKeyboard([
          [Markup.button.webApp("Watch Now 🍿", movieUrl)],
        ]),
      );
    } else {
      ctx.reply("❌ Sorry, this ID does not exist");
    }
  } catch (err) {
    ctx.reply("⚠️ Something went wrong with the database.");
  }
});

bot.action("check_sub", async (ctx) => {
  const isSubscribed = await checkSubscription(ctx);
  if (isSubscribed) {
    await ctx.answerCbQuery("Subscribed successfully ✅");
    ctx.editMessageText("Thanks! Now you can send me the ID 🚀");
  } else {
    await ctx.answerCbQuery("⚠️ You haven't subscribed yet!", {
      show_alert: true,
    });
  }
});

bot.launch().then(() => console.log("Bot ishga tushdi! ✅"));
