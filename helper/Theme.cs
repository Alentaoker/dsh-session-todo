using System;
using System.Linq;
using System.Collections.Generic;
using Microsoft.Win32;
using System.Windows;
using System.Windows.Data;
using System.Windows.Markup;
using System.Windows.Media;

namespace DshSessionTodo
{
    internal sealed partial class TodoWindow
    {
        private sealed class ThemeColor : DependencyObject
        {
            public static readonly DependencyProperty ValueProperty = DependencyProperty.Register("Value", typeof(Color), typeof(ThemeColor));
            public Color Value { get { return (Color)GetValue(ValueProperty); } set { SetValue(ValueProperty, value); } }
        }
        private static readonly Dictionary<SolidColorBrush, ThemeColor> themeColors = new Dictionary<SolidColorBrush, ThemeColor>();
        private static readonly SolidColorBrush PageBrush = Solid("#FFFDF7");
        private static readonly SolidColorBrush HeaderBrush = Solid("#F8F0D4");
        private static readonly SolidColorBrush CardBrush = Solid("#F5F0DF");
        private static readonly SolidColorBrush CardHoverBrush = Solid("#EDE6CF");
        private static readonly SolidColorBrush LineBrush = Solid("#D5D2C4");
        private static readonly SolidColorBrush TextBrush = Solid("#292D26");
        private static readonly SolidColorBrush MutedBrush = Solid("#62665D");
        private static readonly SolidColorBrush AmberBrush = Solid("#8A5B13");
        private static readonly SolidColorBrush PurpleBrush = Solid("#70558F");
        private static readonly SolidColorBrush BlueBrush = Solid("#336A96");
        private static readonly SolidColorBrush RedBrush = Solid("#A53535");
        private static readonly SolidColorBrush GreenBrush = Solid("#526B36");
        private static readonly SolidColorBrush AccentTextBrush = Solid("#FFFFFF");
        private static readonly SolidColorBrush MenuBrush = Solid("#FFFEFA");
        private static readonly SolidColorBrush ErrorSurfaceBrush = Solid("#FBE7DF");
        private bool darkTheme;
        private string themeStamp;
        private static ResourceDictionary paperControlStyles;

        private static SolidColorBrush Solid(string value)
        {
            // A bound color stays mutable when WPF seals templates and resources.
            ThemeColor color = new ThemeColor { Value = Hex(value) };
            SolidColorBrush brush = new SolidColorBrush();
            BindingOperations.SetBinding(brush, SolidColorBrush.ColorProperty, new Binding("Value") { Source = color, Mode = BindingMode.OneWay });
            themeColors.Add(brush, color); return brush;
        }
        private static void SetColor(SolidColorBrush brush, Color color) { themeColors[brush].Value = color; }
        private static Color Hex(string value) { return (Color)ColorConverter.ConvertFromString(value); }
        private static Color Blend(Color baseColor, Color tint, double amount)
        { return Color.FromRgb((byte)Math.Round(baseColor.R * (1 - amount) + tint.R * amount), (byte)Math.Round(baseColor.G * (1 - amount) + tint.G * amount), (byte)Math.Round(baseColor.B * (1 - amount) + tint.B * amount)); }
        private static double Linear(byte value) { double c = value / 255.0; return c <= .04045 ? c / 12.92 : Math.Pow((c + .055) / 1.055, 2.4); }
        private static double Luminance(Color color) { return .2126 * Linear(color.R) + .7152 * Linear(color.G) + .0722 * Linear(color.B); }
        private static double Contrast(Color a, Color b) { double x = Luminance(a), y = Luminance(b); return (Math.Max(x, y) + .05) / (Math.Min(x, y) + .05); }
        private Color ReadableAccent(Color color, Color paper)
        {
            Color target = darkTheme ? Colors.White : Colors.Black;
            for (int i = 0; i < 24 && Contrast(color, paper) < 4.5; i++) color = Blend(color, target, .12);
            return color;
        }

        private bool UseDarkTheme()
        {
            if (appearance == "dark") return true;
            if (appearance != "system") return false;
            try { object mode = Registry.GetValue(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize", "AppsUseLightTheme", 1); return Convert.ToInt32(mode) == 0; }
            catch { return false; }
        }

        private void ApplyPaperTheme()
        {
            if (System.Windows.Application.Current != null && paperControlStyles == null) {
                ResourceDictionary resources = System.Windows.Application.Current.Resources;
                resources["TodoHover"] = CardHoverBrush; resources["TodoAccent"] = GreenBrush;
                resources["TodoPaper"] = PageBrush; resources["TodoLine"] = LineBrush;
                resources["TodoText"] = TextBrush; resources["TodoMenuSurface"] = MenuBrush;
                if (paperControlStyles == null) {
                    paperControlStyles = (ResourceDictionary)XamlReader.Parse(@"
<ResourceDictionary xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' xmlns:x='http://schemas.microsoft.com/winfx/2006/xaml'>
  <Style TargetType='{x:Type TextBox}'>
    <Setter Property='OverridesDefaultStyle' Value='True'/>
    <Setter Property='Foreground' Value='{DynamicResource TodoText}'/>
    <Setter Property='SelectionBrush' Value='{DynamicResource TodoHover}'/>
    <Setter Property='FocusVisualStyle' Value='{x:Null}'/>
    <Setter Property='Template'><Setter.Value><ControlTemplate TargetType='{x:Type TextBox}'>
      <Border x:Name='Frame' Background='{TemplateBinding Background}' BorderBrush='{TemplateBinding BorderBrush}' BorderThickness='{TemplateBinding BorderThickness}' Padding='{TemplateBinding Padding}' CornerRadius='5'>
        <ScrollViewer x:Name='PART_ContentHost' Focusable='False' HorizontalScrollBarVisibility='{TemplateBinding ScrollViewer.HorizontalScrollBarVisibility}' VerticalScrollBarVisibility='{TemplateBinding ScrollViewer.VerticalScrollBarVisibility}'/>
      </Border>
      <ControlTemplate.Triggers>
        <Trigger Property='IsKeyboardFocused' Value='True'><Setter TargetName='Frame' Property='BorderBrush' Value='{DynamicResource TodoAccent}'/></Trigger>
        <Trigger Property='IsEnabled' Value='False'><Setter Property='Opacity' Value='.5'/></Trigger>
      </ControlTemplate.Triggers>
    </ControlTemplate></Setter.Value></Setter>
  </Style>
  <Style TargetType='{x:Type ToolTip}'>
    <Setter Property='OverridesDefaultStyle' Value='True'/><Setter Property='Foreground' Value='{DynamicResource TodoText}'/>
    <Setter Property='FontSize' Value='12'/><Setter Property='MaxWidth' Value='420'/>
    <Setter Property='Template'><Setter.Value><ControlTemplate TargetType='{x:Type ToolTip}'>
      <Border Background='{DynamicResource TodoMenuSurface}' BorderBrush='{DynamicResource TodoLine}' BorderThickness='1' CornerRadius='5' Padding='8,5'><ContentPresenter/></Border>
    </ControlTemplate></Setter.Value></Setter>
  </Style>
</ResourceDictionary>");
                    resources.MergedDictionaries.Add(paperControlStyles);
                }
            }
            string groupColor = "#D2AC54";
            var group = Groups().FirstOrDefault(item => S(V(item, "id")) == selectedGroup);
            if (tab == "todo" && group != null) groupColor = ColorOf(V(group, "color"), groupColor);
            bool dark = UseDarkTheme();
            string stamp = dark + "|" + groupColor + "|" + tab;
            if (themeStamp == stamp) return;
            themeStamp = stamp; darkTheme = dark;
            Color accent = Hex(groupColor), paper = Blend(Hex(dark ? "#242724" : "#FFFDF7"), accent, dark ? .065 : .12);
            SetColor(PageBrush, paper);
            SetColor(HeaderBrush, Blend(paper, accent, dark ? .11 : .23));
            SetColor(CardBrush, Blend(paper, accent, dark ? .10 : .11));
            SetColor(CardHoverBrush, Blend(paper, accent, dark ? .22 : .24));
            SetColor(LineBrush, Blend(paper, Hex(dark ? "#9FA99B" : "#59644C"), dark ? .28 : .24));
            SetColor(TextBrush, Hex(dark ? "#F0F2EC" : "#292D26"));
            SetColor(MutedBrush, ReadableAccent(ReadableAccent(Hex(dark ? "#B7BDB1" : "#62665D"), paper), HeaderBrush.Color));
            SetColor(GreenBrush, ReadableAccent(ReadableAccent(accent, paper), HeaderBrush.Color));
            SetColor(AccentTextBrush, Contrast(GreenBrush.Color, Colors.White) >= 4.5 ? Colors.White : Hex("#20251D"));
            SetColor(AmberBrush, Hex(dark ? "#E6BF76" : "#865609"));
            SetColor(PurpleBrush, Hex(dark ? "#C7B2EB" : "#70558F"));
            SetColor(BlueBrush, Hex(dark ? "#9FC9E7" : "#336A96"));
            SetColor(RedBrush, Hex(dark ? "#F3A7A0" : "#A53535"));
            SetColor(MenuBrush, Blend(paper, Hex(dark ? "#323630" : "#FFFFFF"), .60));
            SetColor(ErrorSurfaceBrush, Hex(dark ? "#432E2A" : "#FBE7DF"));
        }
    }
}
