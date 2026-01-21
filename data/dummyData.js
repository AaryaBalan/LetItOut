// Dummy data for the Let It Out app

export const categories = [
    'Family',
    'Stress',
    'Relationship',
    'Study',
    'Mental Health',
    'Other'
];

export const posts = [
    {
        id: 1,
        title: "Struggling with family expectations",
        category: "Family",
        description: "My parents want me to pursue engineering, but I'm passionate about arts. I feel like I'm living someone else's dream. Every day I wake up feeling trapped and misunderstood. They won't even listen to what I really want. I don't know how to make them understand without disappointing them.",
        preview: "My parents want me to pursue engineering, but I'm passionate about arts...",
        timestamp: "2 hours ago",
        reactions: {
            support: 24,
            hug: 18
        },
        comments: [
            {
                id: 101,
                text: "You're not alone in this. Many people face similar pressure. Remember, your happiness matters too. Have you tried having an honest conversation with your parents about your dreams?",
                timestamp: "1 hour ago"
            },
            {
                id: 102,
                text: "I went through something similar. What helped me was showing my parents examples of successful people in the field I was passionate about. Maybe you could create a plan that shows them you've thought this through seriously.",
                timestamp: "45 minutes ago"
            },
            {
                id: 103,
                text: "Your feelings are completely valid. It's your life and your future. While parents mean well, ultimately you need to make decisions that align with your true self. Sending you strength! 💜",
                timestamp: "30 minutes ago"
            }
        ]
    },
    {
        id: 2,
        title: "Anxiety about upcoming exams",
        category: "Study",
        description: "Finals are next week and I can't seem to focus. Every time I try to study, my mind goes blank. I'm scared I'll fail and disappoint everyone. The pressure is overwhelming.",
        preview: "Finals are next week and I can't seem to focus. Every time I try to study...",
        timestamp: "4 hours ago",
        reactions: {
            support: 42,
            hug: 31
        },
        comments: [
            {
                id: 201,
                text: "Take it one step at a time. Break your study material into smaller chunks. Remember, your worth isn't defined by exam grades. You've got this! 🌟",
                timestamp: "3 hours ago"
            },
            {
                id: 202,
                text: "I know exactly how you feel. What worked for me was the Pomodoro technique - 25 minutes of focused study, then a 5-minute break. It made studying less overwhelming.",
                timestamp: "2 hours ago"
            }
        ]
    },
    {
        id: 3,
        title: "Feeling lonely after moving to a new city",
        category: "Mental Health",
        description: "I moved here for work three months ago. I thought I'd make friends by now, but everyone seems so busy. I spend most evenings alone. I miss having people who understand me.",
        preview: "I moved here for work three months ago. I thought I'd make friends by now...",
        timestamp: "6 hours ago",
        reactions: {
            support: 56,
            hug: 45
        },
        comments: [
            {
                id: 301,
                text: "Moving to a new place is really tough. Have you tried joining local clubs or groups related to your hobbies? That's how I met my closest friends in a new city.",
                timestamp: "5 hours ago"
            },
            {
                id: 302,
                text: "Three months is still early. Building meaningful connections takes time. Be patient with yourself. Also, remember that quality matters more than quantity when it comes to friendships. 💛",
                timestamp: "4 hours ago"
            },
            {
                id: 303,
                text: "I felt the same way when I moved! Try apps like Meetup or Bumble BFF. Also, talking to coworkers or joining a gym class helped me. You'll find your people! 🤗",
                timestamp: "3 hours ago"
            }
        ]
    },
    {
        id: 4,
        title: "Relationship issues with my partner",
        category: "Relationship",
        description: "We've been together for 2 years but lately we argue about everything. I feel like we're growing apart. I still love them but I don't know if love is enough anymore.",
        preview: "We've been together for 2 years but lately we argue about everything...",
        timestamp: "8 hours ago",
        reactions: {
            support: 38,
            hug: 29
        },
        comments: [
            {
                id: 401,
                text: "Communication is key. Have you tried couples counseling? Sometimes a neutral third party can help both people express what they really feel.",
                timestamp: "7 hours ago"
            },
            {
                id: 402,
                text: "Relationships have seasons. This could be a rough patch that you both can work through together. But it's also important to recognize when it might be time to let go. Trust your instincts.",
                timestamp: "6 hours ago"
            }
        ]
    },
    {
        id: 5,
        title: "Burnout from work stress",
        category: "Stress",
        description: "I'm working 12+ hours a day, 6 days a week. My boss keeps piling on more tasks. I can't remember the last time I felt rested. I'm exhausted physically and mentally. I don't know how much longer I can do this.",
        preview: "I'm working 12+ hours a day, 6 days a week. My boss keeps piling on more tasks...",
        timestamp: "10 hours ago",
        reactions: {
            support: 67,
            hug: 52
        },
        comments: [
            {
                id: 501,
                text: "This is not sustainable. Your health should come first. Have you considered talking to HR about your workload? You deserve better work-life balance.",
                timestamp: "9 hours ago"
            },
            {
                id: 502,
                text: "I experienced burnout last year and it took months to recover. Please take care of yourself. Sometimes we need to set boundaries even if it feels uncomfortable. Your well-being matters! ❤️",
                timestamp: "8 hours ago"
            },
            {
                id: 503,
                text: "Consider taking a mental health day if possible. Even one day to rest and recharge can help. And maybe start looking for other opportunities - you deserve a workplace that values you.",
                timestamp: "7 hours ago"
            }
        ]
    },
    {
        id: 6,
        title: "Dealing with impostor syndrome",
        category: "Other",
        description: "I recently got promoted but I feel like I don't deserve it. Everyone around me seems so much smarter and more capable. I'm terrified they'll realize I'm not good enough.",
        preview: "I recently got promoted but I feel like I don't deserve it. Everyone around me...",
        timestamp: "1 day ago",
        reactions: {
            support: 89,
            hug: 71
        },
        comments: [
            {
                id: 601,
                text: "Impostor syndrome is so common, especially among high achievers. The fact that you got promoted means someone saw your value. You earned this! 🌟",
                timestamp: "20 hours ago"
            },
            {
                id: 602,
                text: "I struggle with this too. What helps me is keeping a 'wins' journal where I write down my accomplishments. When self-doubt creeps in, I read it to remind myself of what I've achieved.",
                timestamp: "18 hours ago"
            },
            {
                id: 603,
                text: "Remember that everyone feels this way sometimes, even the people you think are so confident. You belong in that position. Give yourself credit for your hard work and skills. 💜",
                timestamp: "16 hours ago"
            }
        ]
    }
];

export const getCategoryColor = (category) => {
    const colors = {
        'Family': 'bg-blue-100 text-blue-800',
        'Stress': 'bg-red-100 text-red-800',
        'Relationship': 'bg-pink-100 text-pink-800',
        'Study': 'bg-green-100 text-green-800',
        'Mental Health': 'bg-purple-100 text-purple-800',
        'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors['Other'];
};

export const getPostById = (id) => {
    return posts.find(post => post.id === parseInt(id));
};
