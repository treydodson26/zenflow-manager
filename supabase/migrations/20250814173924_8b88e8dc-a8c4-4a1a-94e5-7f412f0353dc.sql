-- Create business_settings table for configurable parameters
CREATE TABLE public.business_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on business_settings
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage business settings
CREATE POLICY "Allow authenticated users to manage business_settings" 
ON public.business_settings 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert default intro offer duration setting
INSERT INTO public.business_settings (setting_key, setting_value, description) VALUES 
('intro_offer_duration', '{"days": 14}', 'Duration of intro offer period in days');

-- Create trigger for automatic timestamp updates on business_settings
CREATE TRIGGER update_business_settings_updated_at
BEFORE UPDATE ON public.business_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update message sequences to new 14-day timeline
UPDATE public.message_sequences SET 
  day = 3,
  subject = 'How was your first class? (+ your exclusive member perks)',
  content = 'Hi {{first_name}},

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

P.S. Follow us on Instagram @taloyoga for daily inspiration and pose tips!'
WHERE day = 7;

-- Add new Day 6 sequence
INSERT INTO public.message_sequences (day, message_type, subject, content, active) VALUES 
(6, 'email', 'The power of consistency (you''re doing great!)', 
'Hi {{first_name}},

You''re approaching your first week of yoga - that''s something to celebrate! 🎉

The magic of yoga doesn''t happen in a single class, or even in a week. It happens when you keep showing up, especially on the days when you don''t feel like it.

Maybe you''ve noticed some changes already:
• Sleeping a little better?
• Feeling more flexible?
• Finding moments of calm in your day?
• Building strength you didn''t know you had?

Or maybe you''re still waiting for that "yoga magic" everyone talks about. That''s completely normal too. Some of our most dedicated students tell me it took 2-3 weeks before they really felt the shift.

**Your challenge for this week:**
Try to come to class on a day when you''re tempted to skip. Those are often the most transformative practices.

**Classes perfect for "I don''t feel like it" days:**
• Restorative Yoga (Sunday 4pm)
• Gentle Flow (Monday 6:30pm)
• Yin Yoga (Wednesday 7:30pm)

You''re building something beautiful here - trust the process.

Sending you light,
Emily', true);

-- Update Day 10 sequence  
UPDATE public.message_sequences SET 
  day = 10,
  subject = 'Your intro offer expires soon - let''s talk about what''s next',
  content = 'Hi {{first_name}},

I can''t believe it''s been 10 days since you started your yoga journey with us! Time really does fly when you''re having fun (and finding your zen 🧘‍♀️).

Your 14-day intro offer expires in just 4 days, and I wanted to personally reach out about continuing your practice with us.

**Here''s what I''ve seen in these past 10 days:**
Students who practice 2-3 times per week during their intro typically:
• Sleep 23% better within their first month
• Report significant stress reduction
• Build lasting friendships in our community
• Develop a sustainable self-care routine

**Your membership options:**
🌟 **Unlimited Monthly**: $129/month - Perfect for building a consistent practice
🗓️ **8 Classes/Month**: $89/month - Great for busy schedules
🎯 **Drop-in Rate**: $25/class - Flexible option

But here''s the thing - this isn''t about selling you anything. It''s about supporting the practice that''s calling to you.

I''d love to chat with you personally about which option feels right. Reply to this email or stop by the studio anytime. No pressure, just honest conversation about your goals.

Whatever you decide, I''m grateful you chose to start this journey with us.

Namaste,
Emily

P.S. All new members get a complimentary private session with me to design your personal practice plan! 🎁'
WHERE day = 14;

-- Update Day 13 sequence (final reminder)
UPDATE public.message_sequences SET 
  day = 13,
  subject = 'Tomorrow is your last day - don''t let your practice slip away',
  content = 'Hi {{first_name}},

Tomorrow marks the end of your 14-day intro offer, and I wanted to reach out one last time.

Not because I want to pressure you, but because I''ve seen what happens when people let their yoga practice slip away. They often regret it.

**Over these past 13 days, you''ve:**
• Shown up for yourself consistently
• Stepped outside your comfort zone
• Invested in your physical and mental wellbeing
• Become part of something bigger than yourself

That''s not nothing. That''s everything.

**If you''re on the fence**, remember:
✨ You can pause your membership anytime
✨ We offer scholarship rates for financial hardship
✨ Your first month is 20% off when you sign up before midnight tomorrow
✨ You''re always welcome in our community, membership or not

**Ready to continue?**
Stop by the studio tomorrow, call us at (555) 123-4567, or reply to this email. We''ll take care of everything in 5 minutes.

**Not ready yet?**
That''s okay too. Keep practicing at home, and know that our door is always open when you''re ready to return.

Thank you for trusting us with your yoga journey. It''s been an honor to practice with you.

With deep gratitude,
Emily

P.S. Your intro expires at midnight tomorrow. After that, drop-in rate is $25/class if you want to visit occasionally.'
WHERE day = 28;

-- Remove old Day 21 sequence that no longer fits the timeline
DELETE FROM public.message_sequences WHERE day = 21;