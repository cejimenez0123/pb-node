module.exports = function slackEventTemplate({email}) {
    return {
        from: `Plumbum <${process.env.pbEmail}>`, // Sender address
        to: email, // Recipient's email
        subject: 'Meet, Write, Connect—Plumbum’s Mixer & Slack Invite',
        html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plumbum Creative Mixer & Slack</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Montserrat:wght@400;700&family=Open+Sans:wght@400;700&display=swap');
        body { font-family: 'Open Sans', sans-serif; background-color: #f4f4f4; padding: 20px; color: #333; }
        .container { background: #ffffff; padding: 20px; border-radius: 5px; max-width: 600px; margin: auto; text-align: center; }
        h1, h2 { font-family: 'Lora', serif; color: #2c7a7b; }
        p { font-family: 'Montserrat', sans-serif; line-height: 1.5;color: #000000 !important; }
        .button { background: #2c7a7b; color: #ffffff !important; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Plumbum Writers Workshop & Mixer</h1>
        <p>We have some exciting events lined up and would love for you to join us!</p>
     
        <h2>🖋️ May 31st: Plumbum x BXWriters Writers Workshop will be at Boogie Down Grind</h2>
        <p>Our next workshop is going to be extra special! We’re partnering with the Andrew Freedman Home for a reading and writing workshop series as part of their Bronx Frame series. It’s a fantastic opportunity to connect with fellow writers and engage in creative exploration!</p>
        <div style="text-align: center; margin: 20px 0;">
            <a href="https://partiful.com/e/FYxUn8VtOO4ZooKi4ayI" style="text-decoration: none;">
                <img src="https://drive.google.com/uc?export=view&id=1KbPSd2JzX4TNOkAwEF277bDugm1g4Afk" alt="Plumbum Writers Workshop" style="max-width: 16em; border-radius: 8px;">
            </a>
        </div>
        <h2>🖋️ June 9th: Writers Workshop & Reading at Andrew Freedman Home</h2>
        <p>Our next workshop is going to be extra special! We’re partnering with the Andrew Freedman Home for a reading and writing workshop series as part of their Bronx Frame series. It’s a fantastic opportunity to connect with fellow writers and engage in creative exploration!</p>
        <div style="text-align: center; margin: 20px 0;">
            <a href="https://partiful.com/e/FYxUn8VtOO4ZooKi4ayI" style="text-decoration: none;">
                <img src="https://drive.google.com/uc?export=view&id=1HBAvl5CjXj2aPY1lytCxXyk6suE-Amnm" alt="Plumbum Writers Workshop" style="max-width: 16em; border-radius: 8px;">
            </a>
        </div>

        <!-- The Bronx Circle -->
        <h2>🗣️ The Bronx Circle - Philosophy Discussion</h2>
        <p>We’re diving deep into the topic of *How to Change?* with a focus on *Beauty as a Tool for Change*. This will be a thought-provoking discussion, and we’d love for you to be a part of it.</p>
        <div style="text-align: center; margin: 20px 0;">
           <a href="https://partiful.com/e/E9TIyNUzOpNzwl0G0hYO"> <img src="https://drive.google.com/uc?export=view&id=1DASCa-P9eFSegsdkcW66_i53WIM46_yA" alt="The Bronx Circle" style="max-width: 16em; border-radius: 8px;"></a>
        </div>

        <!-- Summer Events Mixer -->
        <h2>🎉 Summer Events - Mixer & Open Mic!</h2>
        <p>Get ready for our summer festivities! We're going try to close out summer strong with a mixer on August 28th featuring music, performances, and a whole lot of dancing. Plus, don't miss our Open Mic on August 9th—an opportunity to share your voice and creativity!</p>
        <div style="text-align: center; margin: 20px 0;">
            <img src="https://drive.usercontent.google.com/download?id=1u0nt20ZrSNsLMJ-PP_Ku0Q9X-uOMS42u&export=view&authuser=0" alt="Summer Events Mixer" style="max-width: 16em; border-radius: 8px;">
        </div>
        <h2>📅 Check our Events Calendar</h2>
        <p>You may know we have a calendar, but we update it throughout the week so make sure to check in to see the events you need </p>
        <a href="https://plumbum.app/events" class="button">See Events</a>
        <h2>❤️‍🔥 Explore the History of the Novel & Romance</h2>
        <p>After hearing from many of you, it’s clear: we’re hungry for more context, more history. This essay takes a look at the roots of the novel and romance—where they came from, and how they’ve shaped the way we live and love today.</p>
        <a href="https://plumbum.app/collection/6819d7c722f441091b7dd47b" class="button">Read "R"omance and the
        

        <!-- Slack Community Invite -->
        <h2>💬 Join Our Slack Community</h2>
        <p>We’re on Slack, and it’s already buzzing! It’s a great space for sharing writing prompts, event info, and connecting with fellow writers. Don’t miss out on the fun—join our community today!</p>
        <a href="https://join.slack.com/t/plumbumwriters/shared_invite/zt-2zvkzyi02-dRlhqb0wvHAaU~~dUgh7hQ" class="button">Join the Slack</a>

    </div>
</body>
</html>`,
      
    };
};
