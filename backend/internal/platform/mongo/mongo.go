package mongo

import (
	"context"
	"log/slog"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Client struct {
	DB     *mongo.Database
	client *mongo.Client
}

func Connect(ctx context.Context, uri, dbName string, log *slog.Logger) (*Client, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	clientOpts := options.Client().ApplyURI(uri)
	c, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, err
	}

	if err = c.Ping(ctx, nil); err != nil {
		return nil, err
	}

	log.Info("connected to MongoDB", "database", dbName)
	return &Client{DB: c.Database(dbName), client: c}, nil
}

func (c *Client) Disconnect(ctx context.Context) error {
	return c.client.Disconnect(ctx)
}
