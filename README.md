# LoyalLocal 🏪

**A modern, phone-number-based loyalty rewards system designed for local salons, barbershops, and eateries.**

LoyalLocal eliminates the hassle of traditional punch cards and expensive custom app development by using phone numbers as the primary customer identifier. No apps to download, no cards to carry—just simple, effective customer loyalty tracking.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Active%20Development-green.svg)

## 🎯 Mission

To provide local businesses with an effective, affordable, and easy-to-implement loyalty system that tracks customer visits using phone numbers, fostering repeat business and stronger customer relationships.

## ✨ Key Features

### For Businesses
- **🔐 Secure Business Management**
  - Simple registration and login system
  - Business profile setup and management
  - Administrative dashboard

- **⚙️ Flexible Loyalty Programs**
  - Stamp-based rewards: "Every 5th visit gets 50% off"
  - Customizable reward definitions and thresholds
  - Easy program configuration

- **👥 Streamlined Customer Management**
  - Phone number-based customer lookup
  - Instant customer recognition
  - One-click visit logging
  - Optional customer name collection

- **📊 Business Analytics**
  - Active loyalty member tracking
  - Visit analytics (daily, weekly, monthly)
  - Reward redemption insights

### For Customers
- **📱 Zero-App Experience**
  - No downloads required—just provide your phone number
  - Works with any phone (smartphone not required)
  - Instant enrollment at checkout

- **🎁 Automatic Reward Tracking**
  - Real-time progress tracking
  - Reward notifications when earned
  - Simple redemption process

## 🛠️ Technology Stack

**Frontend**
- HTML5, CSS3, JavaScript
- Responsive design for all devices

**Backend**
- RESTful API architecture
- JWT-based authentication

**Database**
- Supabase for data management
- Encrypted customer data storage

**Deployment**
- Currently hosted on GitHub Pages
- Static website deployment

## 🚀 How It Works

### 1. New Customer Enrollment
1. Customer makes a purchase
2. Staff requests phone number for loyalty program
3. System creates customer profile (optional name collection)
4. Visit logged with progress indicator
5. Welcome confirmation (optional SMS with consent)

### 2. Returning Customer
1. Customer provides phone number at checkout
2. System instantly recognizes customer and displays progress
3. Visit logged automatically
4. Reward notification if threshold reached

### 3. Reward Redemption
1. Staff looks up customer by phone number
2. System displays available rewards
3. One-click reward redemption
4. Visit counter resets automatically
5. Confirmation sent to customer

## 📦 Installation & Setup

### Prerequisites
- Web browser with JavaScript enabled
- Internet connection
- Supabase account (for database)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/Imisioluwa3/LoyalLocal.git

# Navigate to project directory
cd LoyalLocal

# Open with a local server (recommended)
# Option 1: Using Live Server (VS Code extension)
# Right-click on index.html and select "Open with Live Server"

# Option 2: Using Python's built-in server
python -m http.server 8000

# Option 3: Using Node.js http-server
npx http-server
```

### Configuration
1. **Database Setup**: Configure your Supabase connection
2. **Business Registration**: Create your first business account through the admin portal
3. **Loyalty Program**: Define your reward structure and thresholds

## 🗺️ Roadmap

### Current Version (v1.0)
- ✅ Core loyalty program functionality
- ✅ Phone number-based customer management
- ✅ Basic business dashboard
- ✅ Reward tracking and redemption

### Planned Features (v1.1+)
- 🔄 Points-based loyalty system
- 📱 SMS notifications (Twilio integration)
- 📈 Advanced analytics and reporting
- 🏢 Multi-location business support
- 🔌 POS system integrations
- 🎂 Birthday and special occasion rewards

## 🔒 Privacy & Security

- **Data Protection**: Secure encryption of customer phone numbers and personal information
- **Consent Management**: Clear opt-in process for communications
- **Privacy Compliance**: GDPR considerations built-in
- **Secure Authentication**: JWT token-based security

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows our coding standards and includes appropriate tests.

## 📋 Development Process

- Agile methodology with regular sprints
- Comprehensive testing before releases
- User feedback integration and continuous improvement

## 📞 Support

For technical support, feature requests, or business inquiries:

- **Issues**: [GitHub Issues](https://github.com/Imisioluwa3/LoyalLocal/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Imisioluwa3/LoyalLocal/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💝 Why Choose LoyalLocal?

**For Businesses:**
- **Cost-Effective**: Fraction of the cost of custom app development
- **Easy Implementation**: Setup in minutes, not weeks
- **No Customer Friction**: Customers don't need to download apps
- **Immediate ROI**: Start seeing increased customer retention right away

**For Customers:**
- **Privacy-Focused**: Minimal data collection, maximum convenience
- **Universal Access**: Works with any phone
- **Instant Rewards**: Transparent progress tracking and immediate gratification

---

Built with ❤️ for local businesses everywhere

**⭐ Star this repository if you find it helpful!**