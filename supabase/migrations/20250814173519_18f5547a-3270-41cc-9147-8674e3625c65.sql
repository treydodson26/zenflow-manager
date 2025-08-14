-- Update existing message sequences with Talo Yoga's actual nurture content
UPDATE message_sequences SET 
  subject = 'Welcome to Talo Yoga! Your journey begins now 🧘‍♀️',
  content = 'Hi {{first_name}},

Welcome to the Talo Yoga family! I''m Emily, and I''m so excited you''ve decided to start your yoga journey with us.

Your intro offer gives you unlimited classes for the next 30 days. Here''s what you need to know to get started:

🧘‍♀️ **Book your first class**: Use our app or website to reserve your spot
📍 **Find us**: 123 Main Street, Downtown - plenty of parking available
👕 **What to bring**: Just yourself! We provide mats, blocks, and towels
⏰ **Arrive early**: Come 10-15 minutes before class to get settled

Our beginner-friendly classes run throughout the week. I recommend starting with "Gentle Flow" or "Yoga Basics" if you''re new to yoga.

Ready to book your first class? Click here: [BOOK NOW]

Namaste,
Emily & the Talo Team'
WHERE day = 0 AND message_type = 'email';

UPDATE message_sequences SET 
  content = 'Hi {{first_name}}! Welcome to Talo Yoga 🧘‍♀️ Your 30-day unlimited intro starts now! Book your first class: [LINK] Questions? Just reply! - Emily'
WHERE day = 7 AND message_type = 'text';

UPDATE message_sequences SET 
  subject = 'The magic happens when you keep showing up 💫',
  content = 'Hi {{first_name}},

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

P.S. Struggling with motivation? Our private Facebook group is full of encouraging members sharing their journeys. Want an invite?'
WHERE day = 10 AND message_type = 'email';

UPDATE message_sequences SET 
  content = '{{first_name}}, you''re 1/3 through your intro! 🎉 The magic happens when you keep showing up, especially on the "meh" days. What class can we see you in this week? - Emily'
WHERE day = 14 AND message_type = 'text';

UPDATE message_sequences SET 
  subject = 'Last chance: Your intro offer ends in 2 days! 🏃‍♀️⏰',
  content = 'Hi {{first_name}},

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

P.S. Don''t forget - you still have 2 more days of unlimited access! What class will you take as your "trial finale"?'
WHERE day = 28 AND message_type = 'email';

-- Insert additional sequences that don't exist yet
INSERT INTO message_sequences (day, message_type, subject, content, active) VALUES
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
Emily', true);