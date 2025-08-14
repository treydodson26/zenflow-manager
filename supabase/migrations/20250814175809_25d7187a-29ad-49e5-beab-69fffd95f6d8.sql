-- Update message sequences with Talo Yoga 30-day intro onboarding content

-- Day 0 - Welcome Email
UPDATE public.message_sequences 
SET 
  subject = 'Welcome to Talo Yoga 🌿',
  content = 'Hi [First Name],

Welcome to Talo Yoga! We''re so excited that you decided to join us for an introductory month, and we can''t wait to show you around our studio. Congratulations on signing up for your first class! 

Here are a few tips and best practices to help you feel prepared for class:

Where to Park: We are located between Cambridge Ave and California Ave. There is street parking along Cambridge Ave, a large public parking lot with 2hr parking behind the studio and a public parking garage in front of the studio.

What to Bring: We have mats, towels, and props. You can bring water bottle to fill up at our water jug.

When to Arrive: Please arrive at least 5 minutes before your class for a soft landing and to meet your instructor.

What to Expect: When you enter the studio, your teacher will greet you, orient you to our space, and help you get settled in.

How to Schedule: You can access your booking account, schedule sessions, and make class changes anytime here. Please note we have a 12-hour cancellation window, so be sure to make any updates at least 12 hours before your scheduled class.

We''ll send you more helpful tips during your intro so please keep an eye on your inbox for emails, and please reach out if you need anything at all! 

Thank you so much for choosing Talo Yoga - we can''t wait to meet you soon!

Warmly,
Emily & the Talo Yoga team'
WHERE day = 0 AND message_type = 'email';

-- Day 7 - Text Message
UPDATE public.message_sequences 
SET 
  content = 'Hi [First Name]! This is Emily from Talo Yoga. I''m checking in to see how your first week with us went. Can I help you get booked in for your next class or answer any questions? When you reply, you''ll go straight to my phone- not a robot!'
WHERE day = 7 AND message_type = 'text';

-- Day 10 - Email
UPDATE public.message_sequences 
SET 
  subject = 'A Little About Talo Yoga 🌿 — and How to Make the Most of Your Intro',
  content = 'Hi [First Name],

We''re so glad you''ve stepped into the space with us. We wanted to take a moment to share a bit more about what we''re building here at Talo!

Talo means "home" in Finnish — and that''s exactly what we hope this space feels like. A place to return to yourself. A place to feel welcomed and supported in your yoga practice. Our approach is intentionally minimalist and deeply personalized. We keep classes small, offer thoughtful guidance for all levels, and aim to create a calm, elevated experience where you feel taken care of from the moment you step inside.

If you ever have a question or want help mapping out your intro schedule, please hit reply! 

In the meantime, here''s a few helpful tips:

• Arrive 5-10 mins early for a soft landing into our space and onto your mat.
• Yes, you can bring a friend! All intro students get one guest pass.
• Need to cancel? Just do so through your booking portal 12+ hours before class.
• Looking for something more personalized? We offer private sessions by appointment and specialty classes every Sunday.

Thanks for being here. We''re so happy you''ve found us.

Warmly,
Emily
Founder, Talo Yoga'
WHERE day = 10 AND message_type = 'email';

-- Day 14 - Text Message
UPDATE public.message_sequences 
SET 
  content = 'Hi [First Name], you''re halfway through your intro! Just wanted to check in — how are you feeling? If you''ve found classes you love or have any questions, I''m here. Want help booking the rest of your trial sessions?'
WHERE day = 14 AND message_type = 'text';

-- Day 28 - Email
UPDATE public.message_sequences 
SET 
  subject = 'From Intro to Ritual — Your Path Forward at Talo 🌿',
  content = 'Hi [First Name],

It''s been so lovely having you at the studio this past month. I hope your time here has felt grounding, welcoming, and like something you want to return to.

Many of our students continue with the 8x/month membership ($240/month) — it''s perfect if you''re practicing around 2x/week and includes a monthly guest pass and access to member-only offerings.

But everyone''s needs are different, and I''d love to help you land on what feels right for your life and schedule. Just hit reply — I''m happy to walk through the options with you.

See you on the mat soon! 

Warmly,
Emily
Founder, Talo Yoga'
WHERE day = 28 AND message_type = 'email';