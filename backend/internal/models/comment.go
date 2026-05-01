package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Comment struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PostSlug  string             `bson:"post_slug"     json:"post_slug"`
	Name      string             `bson:"name"          json:"name"`
	Body      string             `bson:"body"          json:"body"`
	CreatedAt time.Time          `bson:"created_at"    json:"created_at"`
}

type CommentRequest struct {
	Name string `json:"name"`
	Body string `json:"body"`
}
