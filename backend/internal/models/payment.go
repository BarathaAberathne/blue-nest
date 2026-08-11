package models

type PaymentStatus string

const (
	PaymentProcessing PaymentStatus = "processing"
	PaymentSucceeded  PaymentStatus = "succeeded"
	PaymentFailed     PaymentStatus = "failed"
	PaymentRefunded   PaymentStatus = "refunded"
)


