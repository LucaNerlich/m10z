import type {Schema, Struct} from '@strapi/strapi';

export interface CollectionTypeBaseContent extends Struct.ComponentSchema {
    collectionName: 'components_collection_type_base_contents';
    info: {
        displayName: 'BaseContent';
        icon: 'message';
    };
    attributes: {
        banner: Schema.Attribute.Media<'images'>;
        cover: Schema.Attribute.Media<'images'>;
        date: Schema.Attribute.DateTime;
        description: Schema.Attribute.Text;
        title: Schema.Attribute.String & Schema.Attribute.Required;
    };
}

export interface SingleTypeBaseFeed extends Struct.ComponentSchema {
    collectionName: 'components_single_type_base_feeds';
    info: {
        displayName: 'BaseFeed';
        icon: 'layer';
    };
    attributes: {
        description: Schema.Attribute.Text & Schema.Attribute.Required;
        image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
        mail: Schema.Attribute.Email & Schema.Attribute.Required;
        title: Schema.Attribute.String & Schema.Attribute.Required;
    };
}

declare module '@strapi/strapi' {
    export module Public {
        export interface ComponentSchemas {
            'collection-type.base-content': CollectionTypeBaseContent;
            'single-type.base-feed': SingleTypeBaseFeed;
        }
    }
}
