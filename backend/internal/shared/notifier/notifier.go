package notifier

import "log"

// Channel identifies a delivery medium.
type Channel string

const (
	ChannelWhatsApp Channel = "whatsapp"
	ChannelEmail    Channel = "email"
	ChannelSMS      Channel = "sms"
	ChannelInApp    Channel = "in_app"
)

// Message is a notification to deliver to a recipient.
type Message struct {
	Channel   Channel
	Recipient string // phone / email / user id
	Title     string
	Body      string
}

// Notifier abstracts outbound notifications. Swap the log stub for real
// WhatsApp/Email/SMS providers without touching call sites.
type Notifier interface {
	Send(msg Message) error
}

// LogNotifier is the development stub: it records notifications to the log
// instead of contacting an external provider.
type LogNotifier struct{}

func NewLogNotifier() *LogNotifier { return &LogNotifier{} }

func (n *LogNotifier) Send(msg Message) error {
	log.Printf("🔔 [notify:%s] to=%s | %s — %s", msg.Channel, msg.Recipient, msg.Title, msg.Body)
	return nil
}
