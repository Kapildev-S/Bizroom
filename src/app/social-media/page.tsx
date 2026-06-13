"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, Copy, CheckCircle, Loader2 } from 'lucide-react';
import { generateSocialMediaCaption } from '@/app/actions/socialMediaActions';
import { useAuth } from '@/lib/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppSettings } from '@/lib/mockData';
import { copyToClipboard } from '@/lib/clipboard';

export default function SocialMediaPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);

  // Form state
  const [businessType, setBusinessType] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [tone, setTone] = useState('Friendly');
  const [language, setLanguage] = useState('English');
  const [postPurpose, setPostPurpose] = useState('Daily post');
  const [description, setDescription] = useState('');
  const [length, setLength] = useState('Medium');
  const [cta, setCta] = useState('');

  // Output state
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');

  // Auto-fill business details from profile
  useEffect(() => {
    const loadBusinessProfile = async () => {
      if (!user) return;

      try {
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'app');
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
          const settings = settingsSnap.data() as AppSettings;
          if (settings.businessProfile?.businessName) {
            setBusinessType(settings.businessProfile.businessName);
          }
        }
      } catch (error) {
        console.error('Error loading business profile:', error);
      }
    };

    loadBusinessProfile();
  }, [user]);

  const handleGenerate = async () => {
    if (!businessType.trim()) {
      alert('Please enter your business type');
      return;
    }

    setLoading(true);
    setCaption('');
    setHashtags('');

    try {
      const result = await generateSocialMediaCaption({
        business_type: businessType,
        business_category: businessCategory || undefined,
        tone,
        language,
        post_purpose: postPurpose,
        description: description || undefined,
        length,
        cta: cta || undefined,
      });

      if (result.success && result.data) {
        setCaption(result.data.caption);
        setHashtags(result.data.hashtags);
      } else {
        alert(result.error || 'Failed to generate caption');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'caption' | 'hashtags') => {
    try {
      const { copyToClipboard: copy } = await import('@/lib/clipboard');
      await copy(text);
      if (type === 'caption') {
        setCopiedCaption(true);
        setTimeout(() => setCopiedCaption(false), 2000);
      } else {
        setCopiedHashtags(true);
        setTimeout(() => setCopiedHashtags(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold font-headline flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          Social Media AI Assistant
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
          Generate ready-to-post captions and hashtags for your business in seconds
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Post Details</CardTitle>
            <CardDescription>Tell us about your post and we'll create the perfect caption</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Business Type */}
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type *</Label>
              <Input
                id="businessType"
                placeholder="e.g., Grocery Store, Boutique, Restaurant"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              />
            </div>

            {/* Business Category */}
            <div className="space-y-2">
              <Label htmlFor="businessCategory">Business Category (Optional)</Label>
              <Input
                id="businessCategory"
                placeholder="e.g., Retail, Food & Beverage"
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
              />
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Friendly">Friendly</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Festive">Festive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                  <SelectItem value="Tamil">Tamil</SelectItem>
                  <SelectItem value="Mixed">Mixed (English + Regional)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Post Purpose */}
            <div className="space-y-2">
              <Label htmlFor="postPurpose">Post Purpose</Label>
              <Select value={postPurpose} onValueChange={setPostPurpose}>
                <SelectTrigger id="postPurpose">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily post">Daily Post</SelectItem>
                  <SelectItem value="Offer">Offer/Discount</SelectItem>
                  <SelectItem value="New arrival">New Arrival</SelectItem>
                  <SelectItem value="Festival">Festival Greeting</SelectItem>
                  <SelectItem value="Announcement">Announcement</SelectItem>
                  <SelectItem value="Engagement">Customer Engagement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief details about this post..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Caption Length */}
            <div className="space-y-2">
              <Label>Caption Length</Label>
              <RadioGroup value={length} onValueChange={setLength}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Short" id="short" />
                  <Label htmlFor="short" className="font-normal cursor-pointer">Short (WhatsApp)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Medium" id="medium" />
                  <Label htmlFor="medium" className="font-normal cursor-pointer">Medium (Instagram)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Story" id="story" />
                  <Label htmlFor="story" className="font-normal cursor-pointer">Story Style</Label>
                </div>
              </RadioGroup>
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <Label htmlFor="cta">Call-to-Action (Optional)</Label>
              <Input
                id="cta"
                placeholder="e.g., Visit us today, Call now"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={loading || !businessType.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Caption
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Display */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
            <CardDescription>Your ready-to-post caption and hashtags</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Caption */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Caption</Label>
                {caption && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(caption, 'caption')}
                  >
                    {copiedCaption ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
              <Textarea
                value={caption}
                readOnly
                placeholder="Your generated caption will appear here..."
                className="min-h-[200px] bg-muted/50"
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Hashtags</Label>
                {hashtags && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(hashtags, 'hashtags')}
                  >
                    {copiedHashtags ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
              <Textarea
                value={hashtags}
                readOnly
                placeholder="Hashtags will appear here..."
                className="min-h-[100px] bg-muted/50"
              />
            </div>

            {caption && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  ✨ Your content is ready to post! Copy and share on your social media.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
