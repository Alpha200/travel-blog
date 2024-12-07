import type { Schema, Struct } from '@strapi/strapi';

export interface DestinationLocation extends Struct.ComponentSchema {
  collectionName: 'components_destination_locations';
  info: {
    description: '';
    displayName: 'location';
    icon: 'pinMap';
  };
  attributes: {
    latitude: Schema.Attribute.Float & Schema.Attribute.Required;
    longitude: Schema.Attribute.Float & Schema.Attribute.Required;
  };
}

export interface DestinationPicture extends Struct.ComponentSchema {
  collectionName: 'components_destination_pictures';
  info: {
    displayName: 'picture';
    icon: 'picture';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
  };
}

export interface DestinationText extends Struct.ComponentSchema {
  collectionName: 'components_destination_texts';
  info: {
    displayName: 'text';
    icon: 'file';
  };
  attributes: {
    text: Schema.Attribute.Text;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'destination.location': DestinationLocation;
      'destination.picture': DestinationPicture;
      'destination.text': DestinationText;
    }
  }
}
