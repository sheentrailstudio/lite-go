import type { StaticImageData } from "next/image";
import type { Timestamp } from "firebase/firestore";

export type User = {
  id: string; // doc id, same as auth uid
  name: string;
  email: string;
  avatarUrl: string;
  createdAt: Timestamp | string;
};

export type AttributeOption = {
  id: string;
  value: string;
  price: number;
};

export type Attribute = {
  id: string;
  name: string;
  options: AttributeOption[];
};

export type ItemImage = {
  id: string;
  src: string | StaticImageData;
  alt: string;
};

export type Item = {
  id: string; // doc id
  name: string;
  price: number;
  images?: ItemImage[];
  attributes?: Attribute[];
  maxQuantity?: number;
};

export type CartItem = {
  item: Item;
  quantity: number;
  selectedAttributes?: { [attributeId: string]: string }; // attributeId: selected option value
};

export type Participant = {
  id: string; // user id
  user: User;
  items: CartItem[];
  totalCost: number;
};

export type StatusUpdate = {
  id: string; // doc id
  message: string;
  createdAt: string;
};

// Represents the document stored in Firestore
export type GroupBuyOrderDocument = {
  name: string;
  description: string;
  status: 'open' | 'closed' | 'archived';
  visibility: 'public' | 'private';
  initiatorId: string;
  initiatorName: string;
  deadline?: string;
  targetAmount?: number;
  createdAt: Timestamp | string;
  image?: {
    src: string;
    alt: string;
    hint: string;
  };
  enableStatusTracking?: boolean;
  participantIds?: string[];
}

// Represents the complete Order object used in the client, with subcollections fetched
export type Order = GroupBuyOrderDocument & {
  id: string; // doc id
  initiator: User; // Fetched separately
  participants: Participant[]; // Fetched from subcollection
  availableItems: Item[]; // Fetched from subcollection
  statusUpdates?: StatusUpdate[]; // Fetched from subcollection
};
