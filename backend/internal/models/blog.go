package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type BlogPost struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"   json:"id"`
	Slug          string             `bson:"slug"            json:"slug"`
	Title         string             `bson:"title"           json:"title"`
	Excerpt       string             `bson:"excerpt"         json:"excerpt"`
	Body          string             `bson:"body"            json:"body"`
	AuthorID      primitive.ObjectID `bson:"author_id"       json:"author_id"`
	AuthorName    string             `bson:"author_name"     json:"author_name"`
	CoverImage    string             `bson:"cover_image"     json:"cover_image,omitempty"`
	GalleryImages []string           `bson:"gallery_images"  json:"gallery_images,omitempty"`
	Tags          []string           `bson:"tags"            json:"tags,omitempty"`
	BranchSlugs   []string           `bson:"branch_slugs"    json:"branch_slugs,omitempty"`
	LikeCount     int64              `bson:"like_count"      json:"like_count"`
	Published     bool               `bson:"published"       json:"published"`
	PublishedAt   *time.Time         `bson:"published_at"    json:"published_at,omitempty"`
	CreatedAt     time.Time          `bson:"created_at"      json:"created_at"`
	UpdatedAt     time.Time          `bson:"updated_at"      json:"updated_at"`
}
