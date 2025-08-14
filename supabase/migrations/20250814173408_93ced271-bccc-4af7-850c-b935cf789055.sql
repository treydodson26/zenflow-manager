-- Clear existing sequences and add Talo Yoga's complete nurture messages
DELETE FROM message_sequences;

-- Insert Talo Yoga's comprehensive lead nurture message sequences
INSERT INTO message_sequences (day, message_type, subject, content, active) VALUES
-- Day 0 - Welcome sequence
(0, 'email', 'Welcome to Talo Yoga! Your journey begins now 🧘‍♀️', 
'Hi {{first_name}},

Welcome to the Talo Yoga family! I''m Emily, and I''m so excited you''ve decided to start your yoga journey with us.

Your intro offer gives you unlimited classes for the next 30 days. Here''s what you need to know to get started:

🧘‍♀️ **Book your first class**: Use our app or website to reserve your spot
📍 **Find us**: 123 Main Street, Downtown - plenty of parking available
👕 **What to bring**: Just yourself! We provide mats, blocks, and towels
⏰ **Arrive early**: Come 10-15 minutes before class to get settled

Our beginner-friendly classes run throughout the week. I recommend starting with "Gentle Flow" or "Yoga Basics" if you''re new to yoga.

Ready to book your first class? Click here: [BOOK NOW]

Namaste,
Emily & the Talo Team', true),

(0, 'sms', '', 
'Hi {{first_name}}! Welcome to Talo Yoga 🧘‍♀️ Your 30-day unlimited intro starts now! Book your first class: [LINK] Questions? Just reply! - Emily', true),

-- Day 1 - First class encouragement
(1, 'email', 'Ready for your first class? Here''s everything you need to know', 
'Hi {{first_name}},

How are you feeling about starting yoga? It''s totally normal to feel a mix of excitement and nervousness - we''ve all been there!

I wanted to reach out personally to make sure you feel completely prepared for your first class:

**Before You Come:**
• Eat light 2-3 hours before class
• Bring a water bottle (we have a refill station)
• Wear comfortable, stretchy clothes
• No shoes needed - we practice barefoot

**What to Expect:**
• A warm, welcoming environment
• Modifications for every pose
• No judgment - everyone moves at their own pace
• About 10-15 other lovely humans on the same journey

If you haven''t booked yet, I''d love to see you in one of these beginner-friendly classes this week:
• Monday 6:30pm - Gentle Flow with Sarah
• Wednesday 9:30am - Yoga Basics with me
• Friday 7:00pm - Slow Flow with Marcus

Still have questions? Just hit reply - I read every email personally.

See you on the mat soon!
Emily', true),

-- Day 3 - Check-in after first classes
(3, 'email', 'How was your first class? (+ your exclusive member perks)', 
'Hi {{first_name}},

I hope you''ve had a chance to try your first class with us! How did it feel?

Whether you''ve been once or several times already, I wanted to share some exclusive perks that come with being part of our intro offer:

🎯 **Personal attention**: Our instructors know you''re new and will check in with you
🔄 **Free class swaps**: Need to change your booking? No problem, just let us know
📚 **Free workshops**: Join our monthly "Yoga Fundamentals" workshop (usually $25)
🧘‍♀️ **Practice at home**: Access to our online class library during your trial

**Most popular classes for new students:**
• Gentle Flow (perfect for building strength gradually)
• Yin Yoga (deep stretching and relaxation)
• Yoga Basics (learn proper alignment)

Remember, yoga is a practice - not a performance. Every day on the mat is different, and that''s exactly how it should be.

What questions can I answer for you?

With gratitude,
Emily

P.S. Follow us on Instagram @taloyoga for daily inspiration and pose tips!', true),

(3, 'sms', '', 
'Hi {{first_name}}! How was your first class at Talo? Remember, yoga is a practice - be patient with yourself 💕 Any questions? Just text back! - Emily', true),

-- Day 7 - Week 1 check-in
(7, 'email', 'One week in - you''re already building a practice! 🌟', 
'Hi {{first_name}},

It''s been a week since you joined us - how amazing is that?

Whether you''ve made it to one class or five, you''re already building something beautiful: a yoga practice that''s uniquely yours.

**This week, I invite you to:**
• Try a different style of class (maybe Yin if you''ve been doing Flow?)
• Notice how you feel before vs. after class
• Set an intention at the beginning of each practice
• Be kind to yourself - progress isn''t always linear

**Student spotlight:** "I was so nervous for my first class, but Emily and the community made me feel so welcome. A week later, I''ve been to 4 classes and I''m sleeping better than I have in months!" - Sarah M.

**Trending classes this week:**
• Tuesday 7:30am - Morning Flow (great way to start the day!)
• Thursday 6:00pm - Power Flow (build strength and heat)
• Sunday 10:00am - Community Class (relaxed, social atmosphere)

You have 23 more days of unlimited classes. What do you want to explore?

Cheering you on,
Emily

P.S. Our favorite local smoothie spot, Green Garden, offers 10% off to Talo students. Just show your class confirmation!', true),

(7, 'sms', '', 
'{{first_name}}, week 1 complete! 🎉 Which class style is calling to you next? Our schedule has something for every mood. See you on the mat! - Emily', true),

-- Day 10 - Mid-trial motivation
(10, 'email', 'The magic happens when you keep showing up 💫', 
'Hi {{first_name}},

You''re 10 days into your yoga journey, and I wanted to check in with something important:

The magic of yoga doesn''t happen in a single class, or even in a week. It happens when you keep showing up, especially on the days when you don''t feel like it.

Maybe you''ve noticed some changes already:
• Sleeping a little better?
• Feeling more flexible?
• Finding moments of calm in your day?
• Building strength you didn''t know you had?

Or maybe you''re still waiting for that "yoga magic" everyone talks about. That''s completely normal too. Some of our most dedicated students tell me it took 3-4 weeks before they really felt the shift.

**Your challenge for this week:**
Try to come to class on a day when you''re tempted to skip. Those are often the most transformative practices.

**Classes perfect for "I don''t feel like it" days:**
• Restorative Yoga (pure relaxation)
• Gentle Flow (movement without intensity)
• Meditation class (just 30 minutes of stillness)

You''re doing great. Trust the process.

With love,
Emily

P.S. Struggling with motivation? Our private Facebook group is full of encouraging members sharing their journeys. Want an invite?', true),

(10, 'sms', '', 
'{{first_name}}, you''re 1/3 through your intro! 🎉 The magic happens when you keep showing up, especially on the "meh" days. What class can we see you in this week? - Emily', true),

-- Day 14 - Halfway point
(14, 'email', 'Halfway there! Let''s talk about what comes next 🏃‍♀️', 
'Hi {{first_name}},

You''re officially halfway through your 30-day intro offer! 🎉

I''m genuinely curious: How has your experience been so far? What''s surprised you most about yoga or our studio?

As you head into your second half, I want to plant a seed about what your yoga practice could look like beyond these 30 days.

**Our membership options:**
• **Unlimited Monthly**: $120/month for unlimited classes
• **8 Classes/Month**: $85/month (perfect for 2x per week)
• **4 Classes/Month**: $55/month (great for busy schedules)
• **Drop-in Rate**: $20 per class

**But here''s what I really want you to know:** This isn''t about selling you something. It''s about supporting whatever feels right for YOUR life and YOUR practice.

Some students thrive coming every day. Others find their sweet spot at 2-3 times per week. There''s no wrong way to do yoga.

**Questions to consider:**
• How often do you realistically want to practice?
• What time of day works best for your schedule?
• Which teachers and class styles resonate with you?

We''ll talk more about options as your trial progresses, but for now, just keep exploring and enjoying the journey.

You''re doing beautifully.

Emily

P.S. Our annual retreat to Costa Rica is coming up in March. Interested in learning more?', true),

(14, 'sms', '', 
'{{first_name}}, you''re halfway through! 🏃‍♀️ What''s been your favorite discovery so far? Let''s make these next 2 weeks amazing! - Emily', true),

-- Day 21 - Week 3 momentum
(21, 'email', 'Week 3: When everything starts to click ✨', 
'Hi {{first_name}},

Week 3 is magical in yoga.

This is often when students tell me: "Something just clicked!" Maybe it''s finally touching your toes, holding a pose that felt impossible, or simply feeling more at home in your body.

**Celebrating your progress:**
Take a moment to acknowledge how far you''ve come. The person who walked into their first class 3 weeks ago is not the same person reading this email. You''ve grown stronger, more flexible, and more connected to yourself.

**As we head into your final week:**
I want you to start thinking about your yoga practice as a relationship. Like any good relationship, it thrives with consistency, patience, and showing up even when it''s not convenient.

**Member exclusive preview:**
Our unlimited monthly members get access to:
• All regular classes + special workshops
• Member-only events (monthly social nights!)
• 20% off retail and private sessions
• Guest passes for friends
• Priority booking for workshops and retreats

**Your next step:**
Schedule a quick 10-minute chat with me before your trial ends. We''ll talk about your experience and find the perfect membership option for your lifestyle. No pressure - just honest conversation about what works for you.

[SCHEDULE CHAT WITH EMILY]

9 more days of unlimited access. Make them count!

With admiration,
Emily', true),

(21, 'sms', '', 
'{{first_name}}, you''re in week 3! 💪 This is when the magic really starts to happen. How are you feeling? Let''s chat about your next steps soon! - Emily', true),

-- Day 28 - Final nudge
(28, 'email', 'Last chance: Your intro offer ends in 2 days! 🏃‍♀️⏰', 
'Hi {{first_name}},

I can hardly believe it - your 30-day intro offer ends in just 2 days!

Before it does, I want to make sure you don''t miss out on continuing this beautiful practice you''ve started.

**Special transition offer (expires when your intro ends):**
Join as an unlimited member in the next 48 hours and get:
• First month for just $89 (regular $120)
• Free Talo Yoga water bottle
• Complimentary 30-minute private session with me

**Why continue?**
You''ve invested 30 days in building this practice. Don''t let that momentum disappear. Yoga compounds - the benefits multiply the longer you stick with it.

**Ready to continue?**
• Reply to this email, or
• Call/text me at (555) 123-4567, or
• Stop by the studio before your trial ends

**Not ready yet?**
That''s okay too! You can always come back as a drop-in student ($20/class) or start another intro offer in 6 months.

Thank you for letting us be part of your journey these past 30 days. Whatever you decide, you''ll always be part of the Talo family.

With so much gratitude,
Emily

P.S. Don''t forget - you still have 2 more days of unlimited access! What class will you take as your "trial finale"?', true),

(28, 'sms', '', 
'{{first_name}}, your 30-day intro ends in 2 days! ⏰ Ready to continue your practice? Special offer expires with your trial. Text me back or stop by! - Emily', true);